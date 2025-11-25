-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 25, 2025 at 06:10 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `course_registration`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `process_all_waitlists` ()   BEGIN
    DECLARE v_course_id BIGINT;
    DECLARE v_available_seats INT;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE course_cursor CURSOR FOR
        SELECT DISTINCT c.course_id, (c.capacity - c.enrolled) as available_seats
        FROM course c
        INNER JOIN waitlist w ON c.course_id = w.course_id
        WHERE c.capacity > c.enrolled
        ORDER BY c.course_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    START TRANSACTION;
    
    OPEN course_cursor;
    
    course_loop: LOOP
        FETCH course_cursor INTO v_course_id, v_available_seats;
        
        IF done THEN
            LEAVE course_loop;
        END IF;
        
        -- Promote students for this course
        WHILE v_available_seats > 0 DO
            CALL promote_from_waitlist(v_course_id);
            SET v_available_seats = v_available_seats - 1;
        END WHILE;
        
    END LOOP course_loop;
    
    CLOSE course_cursor;
    
    COMMIT;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `process_auction_winners` (IN `p_round_id` INT, IN `p_course_id` INT)   BEGIN
    DECLARE v_capacity INT;
    DECLARE v_enrolled INT;
    DECLARE v_available_seats INT;
    DECLARE v_bid_id BIGINT;
    DECLARE v_student_id BIGINT;
    DECLARE v_bid_amount INT;
    DECLARE v_created_at TIMESTAMP;
    DECLARE v_rank INT DEFAULT 0;
    DECLARE v_winners_count INT DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE bid_cursor CURSOR FOR
        SELECT bid_id, student_id, bid_amount, created_at
        FROM bid
        WHERE round_id = p_round_id 
            AND course_id = p_course_id
            AND status = 'pending'
        ORDER BY bid_amount DESC, created_at ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Get current course capacity and enrollment
    SELECT capacity, COALESCE(enrolled, 0)
    INTO v_capacity, v_enrolled
    FROM course
    WHERE course_id = p_course_id;
    
    SET v_available_seats = v_capacity - v_enrolled;
    
    -- If no seats available, all bids become lost and go to waitlist
    IF v_available_seats <= 0 THEN
        -- Mark all bids as lost
        UPDATE bid SET status = 'lost'
        WHERE round_id = p_round_id AND course_id = p_course_id AND status = 'pending';
        
        -- Refund bid amounts to wallets
        UPDATE wallet w
        INNER JOIN bid b ON w.student_id = b.student_id
        SET w.balance = w.balance + b.bid_amount
        WHERE b.round_id = p_round_id AND b.course_id = p_course_id AND b.status = 'lost';
        
        -- Add all losing bidders to waitlist based on bid amount
        SET @waitlist_position = 0;
        INSERT INTO waitlist (student_id, course_id, position, created_at)
        SELECT b.student_id, b.course_id,
               @waitlist_position := @waitlist_position + 1 AS position, NOW()
        FROM bid b
        WHERE b.round_id = p_round_id AND b.course_id = p_course_id AND b.status = 'lost'
        ORDER BY b.bid_amount DESC, b.created_at ASC
        ON DUPLICATE KEY UPDATE position = VALUES(position);
        
    ELSE
        -- Process bids one by one
        OPEN bid_cursor;
        
        bid_loop: LOOP
            FETCH bid_cursor INTO v_bid_id, v_student_id, v_bid_amount, v_created_at;
            IF done THEN LEAVE bid_loop; END IF;
            SET v_rank = v_rank + 1;
            
            -- Winner: has a seat available
            IF v_rank <= v_available_seats THEN
                -- Mark bid as won
                UPDATE bid SET status = 'won' WHERE bid_id = v_bid_id;
                
                -- Create enrollment if doesn't exist
                IF NOT EXISTS (SELECT 1 FROM enrollment 
                              WHERE student_id = v_student_id AND course_id = p_course_id) THEN
                    INSERT INTO enrollment (student_id, course_id, round_id, bid_id, enrollment_date)
                    VALUES (v_student_id, p_course_id, p_round_id, v_bid_id, NOW());
                    
                    -- Increment winners count (we'll update enrolled in one go later)
                    SET v_winners_count = v_winners_count + 1;
                END IF;
                
            -- Loser: no seat available
            ELSE
                -- Mark bid as lost
                UPDATE bid SET status = 'lost' WHERE bid_id = v_bid_id;
                
                -- Refund bid amount
                UPDATE wallet SET balance = balance + v_bid_amount WHERE student_id = v_student_id;
                
                -- Add to waitlist if not already there
                IF NOT EXISTS (SELECT 1 FROM waitlist 
                              WHERE student_id = v_student_id AND course_id = p_course_id) THEN
                    INSERT INTO waitlist (student_id, course_id, position, created_at)
                    VALUES (v_student_id, p_course_id, v_rank - v_available_seats, NOW());
                END IF;
            END IF;
        END LOOP bid_loop;
        
        CLOSE bid_cursor;
        
        -- Update enrolled count ONCE with the total number of new enrollments
        -- This prevents exceeding capacity
        IF v_winners_count > 0 THEN
            UPDATE course 
            SET enrolled = LEAST(v_enrolled + v_winners_count, capacity)
            WHERE course_id = p_course_id;
        END IF;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `process_round_bids` (IN `p_round_id` INT)   BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_end_time DATETIME;
    DECLARE v_processed_at DATETIME;
    DECLARE v_can_process BOOLEAN DEFAULT FALSE;
    
    -- Get round details
    SELECT status, end_time, processed_at
    INTO v_status, v_end_time, v_processed_at
    FROM round
    WHERE round_id = p_round_id;
    
    -- Check if already processed
    IF v_processed_at IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Round has already been processed';
    END IF;
    
    -- Can process if status is 'completed'
    IF v_status = 'closed' THEN
        SET v_can_process = TRUE;
    END IF;
    
    -- Can process if time has ended
    IF v_end_time IS NOT NULL AND NOW() >= v_end_time THEN
        SET v_can_process = TRUE;
    END IF;
    
    -- Reject if cannot process
    IF NOT v_can_process THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Round is not ready to be processed. Must be completed or past end time.';
    END IF;
    
    -- Update round status to processing
    UPDATE round SET status = 'processing' WHERE round_id = p_round_id;
    
    -- Process each course
    BEGIN
        DECLARE v_course_id BIGINT;
        DECLARE done INT DEFAULT FALSE;
        DECLARE course_cursor CURSOR FOR
            SELECT DISTINCT course_id 
            FROM bid 
            WHERE round_id = p_round_id AND status = 'pending';
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
        
        OPEN course_cursor;
        
        course_loop: LOOP
            FETCH course_cursor INTO v_course_id;
            IF done THEN LEAVE course_loop; END IF;
            
            CALL process_auction_winners(p_round_id, v_course_id);
        END LOOP course_loop;
        
        CLOSE course_cursor;
    END;
    
    -- Mark as closed
    UPDATE round 
    SET status = 'closed', processed_at = NOW() 
    WHERE round_id = p_round_id;
    
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `promote_from_waitlist` (IN `p_course_id` BIGINT)   BEGIN
    DECLARE v_student_id BIGINT;
    DECLARE v_waitlist_id BIGINT;
    DECLARE v_capacity INT;
    DECLARE v_enrolled INT;
    DECLARE v_available_seats INT;
    
    -- Get course capacity and current enrollment
    SELECT capacity, enrolled 
    INTO v_capacity, v_enrolled
    FROM course
    WHERE course_id = p_course_id;
    
    SET v_available_seats = v_capacity - v_enrolled;
    
    -- If seats available, promote from waitlist
    IF v_available_seats > 0 THEN
        -- Get first person on waitlist (lowest position)
        SELECT student_id, waitlist_id 
        INTO v_student_id, v_waitlist_id
        FROM waitlist
        WHERE course_id = p_course_id
        ORDER BY position ASC, created_at ASC
        LIMIT 1;
        
        -- If someone on waitlist
        IF v_student_id IS NOT NULL THEN
            -- Enroll the student (trigger will update course.enrolled)
            INSERT INTO enrollment (student_id, course_id, enrollment_date)
            VALUES (v_student_id, p_course_id, NOW());
            
            -- Remove from waitlist
            DELETE FROM waitlist WHERE waitlist_id = v_waitlist_id;
            
            -- Send notification
            INSERT INTO notification (student_id, title, message, type, is_read, created_at)
            VALUES (
                v_student_id,
                'Promoted from Waitlist!',
                CONCAT('You have been enrolled in a course from the waitlist.'),
                'success',
                FALSE,
                NOW()
            );
        END IF;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_place_bid` (IN `p_student_id` BIGINT, IN `p_course_id` BIGINT, IN `p_round_id` INT, IN `p_bid_amount` INT)   BEGIN
    DECLARE v_balance INT;
    DECLARE v_min_bid INT;
    DECLARE existing_bid_id BIGINT DEFAULT NULL;
    DECLARE existing_bid_amount INT DEFAULT 0;
    
    -- Check wallet balance
    SELECT balance INTO v_balance 
    FROM wallet 
    WHERE student_id = p_student_id;
    
    IF v_balance < p_bid_amount THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Insufficient balance';
    END IF;
    
    -- Check minimum bid
    SELECT min_bid INTO v_min_bid 
    FROM course 
    WHERE course_id = p_course_id;
    
    IF p_bid_amount < v_min_bid THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Bid amount below minimum bid';
    END IF;
    
    -- Check for existing bid
    SELECT bid_id, bid_amount INTO existing_bid_id, existing_bid_amount
    FROM bid
    WHERE student_id = p_student_id 
      AND course_id = p_course_id 
      AND round_id = p_round_id
      AND status = 'pending';
    
    -- If updating existing bid, refund the old amount first
    IF existing_bid_id IS NOT NULL THEN
        UPDATE wallet 
        SET balance = balance + existing_bid_amount
        WHERE student_id = p_student_id;
    END IF;
    
    -- Deduct new bid amount from wallet (THIS IS THE KEY PART)
    UPDATE wallet 
    SET balance = balance - p_bid_amount,
        total_spent = total_spent + p_bid_amount
    WHERE student_id = p_student_id;
    
    -- Insert or update bid
    IF existing_bid_id IS NULL THEN
        INSERT INTO bid (student_id, course_id, round_id, bid_amount, status, priority, created_at, updated_at)
        VALUES (p_student_id, p_course_id, p_round_id, p_bid_amount, 'pending', 0, NOW(), NOW());
    ELSE
        UPDATE bid 
        SET bid_amount = p_bid_amount, 
            updated_at = NOW()
        WHERE bid_id = existing_bid_id;
    END IF;
    
END$$

--
-- Functions
--
CREATE DEFINER=`root`@`localhost` FUNCTION `is_course_full` (`p_course_id` INT) RETURNS TINYINT(1) DETERMINISTIC READS SQL DATA BEGIN
    DECLARE v_capacity INT;
    DECLARE v_enrolled INT;
    
    -- Get both capacity and enrolled count from Course table
    SELECT capacity, enrolled 
    INTO v_capacity, v_enrolled
    FROM course 
    WHERE course_id = p_course_id;
    
    -- Return true if enrolled >= capacity, false otherwise
    RETURN v_enrolled >= v_capacity;
END$$

CREATE DEFINER=`root`@`localhost` FUNCTION `validate_min_credits` (`p_student_id` INT) RETURNS TINYINT(1) DETERMINISTIC READS SQL DATA BEGIN
    DECLARE total_credits INT DEFAULT 0;
    
    SELECT COALESCE(SUM(c.credits), 0) 
    INTO total_credits
    FROM enrollment e
    JOIN course c ON e.course_id = c.course_id
    WHERE e.student_id = p_student_id;
    
    RETURN total_credits >= 9;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `Auction_Round`
--

CREATE TABLE `Auction_Round` (
  `round_id` int(11) NOT NULL,
  `round_number` int(11) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('pending','active','closed') NOT NULL DEFAULT 'pending'
) ;

--
-- Dumping data for table `Auction_Round`
--

INSERT INTO `Auction_Round` (`round_id`, `round_number`, `start_time`, `end_time`, `status`) VALUES
(2, 2, '2025-08-02 08:00:00', '2025-08-02 20:00:00', 'closed'),
(3, 3, '2025-08-03 08:00:00', '2025-08-03 20:00:00', 'active'),
(4, 4, '2025-08-04 08:00:00', '2025-08-04 20:00:00', 'pending'),
(5, 5, '2025-08-05 08:00:00', '2025-08-05 20:00:00', 'pending'),
(6, 1, '2025-09-01 08:00:00', '2025-09-01 20:00:00', 'pending'),
(7, 2, '2025-09-02 08:00:00', '2025-09-02 20:00:00', 'pending'),
(8, 3, '2025-09-03 08:00:00', '2025-09-03 20:00:00', 'pending'),
(9, 1, '2026-01-15 08:00:00', '2026-01-15 20:00:00', 'pending'),
(10, 2, '2026-01-16 08:00:00', '2026-01-16 20:00:00', 'pending'),
(11, 3, '2026-01-17 08:00:00', '2026-01-17 20:00:00', 'pending'),
(12, 4, '2026-01-18 08:00:00', '2026-01-18 20:00:00', 'pending'),
(13, 5, '2025-08-06 08:00:00', '2025-08-06 20:00:00', 'pending');

-- --------------------------------------------------------

--
-- Table structure for table `bid`
--

CREATE TABLE `bid` (
  `bid_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `course_id` bigint(20) NOT NULL,
  `round_id` int(11) NOT NULL,
  `bid_amount` int(11) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `priority` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `bid`
--

INSERT INTO `bid` (`bid_id`, `student_id`, `course_id`, `round_id`, `bid_amount`, `status`, `priority`, `created_at`, `updated_at`) VALUES
(24, 1, 18, 16, 40, 'won', 0, '2025-11-25 04:02:25', '2025-11-25 04:14:30'),
(25, 2, 18, 16, 35, 'won', 0, '2025-11-25 04:03:01', '2025-11-25 04:14:30'),
(26, 3, 18, 16, 40, 'won', 0, '2025-11-25 04:03:43', '2025-11-25 04:14:30'),
(27, 7, 18, 16, 20, 'lost', 0, '2025-11-25 04:04:43', '2025-11-25 04:14:30');

-- --------------------------------------------------------

--
-- Table structure for table `course`
--

CREATE TABLE `course` (
  `course_id` bigint(20) NOT NULL,
  `course_code` varchar(20) NOT NULL,
  `course_name` varchar(200) NOT NULL,
  `dept_id` int(11) NOT NULL,
  `instructor_name` varchar(100) NOT NULL,
  `credits` int(11) NOT NULL DEFAULT 3,
  `capacity` int(11) NOT NULL,
  `enrolled` int(11) DEFAULT 0,
  `min_bid` int(11) DEFAULT 10,
  `description` text DEFAULT NULL,
  `prerequisites` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `course`
--

INSERT INTO `course` (`course_id`, `course_code`, `course_name`, `dept_id`, `instructor_name`, `credits`, `capacity`, `enrolled`, `min_bid`, `description`, `prerequisites`, `created_at`, `updated_at`) VALUES
(1, 'CS101', 'Introduction to Programming', 6, 'Dr. Emily Chen', 3, 45, 0, 15, 'Learn programming fundamentals with Java', 'C++', '2025-11-19 05:03:04', '2025-11-19 23:34:26'),
(2, 'CS201', 'Data Structures and Algorithms', 1, 'Prof. Michael Zhang', 4, 25, 0, 15, 'Advanced data structures and algorithm analysis', NULL, '2025-11-19 05:03:04', '2025-11-19 05:03:04'),
(3, 'CS301', 'Database Systems', 1, 'Dr. Sarah Williams', 3, 20, 2, 20, 'Relational databases, SQL, and design', NULL, '2025-11-19 05:03:04', '2025-11-24 02:10:21'),
(4, 'CS401', 'Machine Learning', 1, 'Prof. David Kumar', 4, 15, 0, 30, 'Introduction to ML algorithms and applications', NULL, '2025-11-19 05:03:04', '2025-11-24 04:31:49'),
(5, 'EE202', 'Circuit Analysis', 2, 'Dr. Robert Taylor', 4, 25, 0, 12, 'Fundamental circuit analysis techniques', NULL, '2025-11-19 05:03:04', '2025-11-19 05:03:04'),
(6, 'EE305', 'Digital Signal Processing', 2, 'Prof. Lisa Anderson', 3, 20, 0, 18, 'Digital signal processing fundamentals', NULL, '2025-11-19 05:03:04', '2025-11-19 05:03:04'),
(7, 'ME210', 'Thermodynamics', 3, 'Dr. James Wilson', 3, 30, 0, 10, 'Basic thermodynamics principles', NULL, '2025-11-19 05:03:04', '2025-11-19 05:03:04'),
(8, 'MATH301', 'Linear Algebra', 4, 'Prof. Anna Martinez', 3, 35, 0, 8, 'Matrices, vector spaces, and transformations', NULL, '2025-11-19 05:03:04', '2025-11-19 05:03:04'),
(9, 'PHYS201', 'Quantum Mechanics I', 5, 'Dr. Richard Feynman', 4, 20, 0, 25, 'Introduction to quantum mechanics', NULL, '2025-11-19 05:03:04', '2025-11-19 05:03:04'),
(10, 'BA302', 'Corporate Finance New', 6, 'Prof. Warren Buffett Sr', 4, 9, 4, 20, 'Financial management and analysis and trading', 'MATH and Eco', '2025-11-19 05:03:04', '2025-11-24 02:10:21'),
(14, 'BA706', 'DBMS', 1, 'Shreyas Kaldate', 3, 28, 1, 20, 'He is king DB , take his course', 'Basics of SQL', '2025-11-19 18:45:27', '2025-11-24 04:42:45'),
(15, 'CS101', 'Intro to Java', 1, 'Bhagyashri Patil', 3, 1, 1, 10, 'She is Queen of Java, take her course', '', '2025-11-20 14:10:47', '2025-11-20 16:03:17'),
(16, 'CS3310', 'Cloud Computing', 1, 'Prof Sambit Sahu', 3, 30, 0, 20, NULL, NULL, '2025-11-23 18:54:59', '2025-11-23 18:54:59'),
(17, 'CS3310', 'Cloud Computing', 1, 'Prof Sambit Sahu', 3, 30, 0, 20, NULL, NULL, '2025-11-23 18:55:31', '2025-11-23 18:55:31'),
(18, 'CSTT', 'Test Course ', 1, 'Vikram Markali', 3, 3, 3, 20, NULL, 'NA', '2025-11-25 03:59:55', '2025-11-25 04:14:30');

-- --------------------------------------------------------

--
-- Table structure for table `course_schedule`
--

CREATE TABLE `course_schedule` (
  `schedule_id` bigint(20) NOT NULL,
  `course_id` bigint(20) NOT NULL,
  `day_of_week` varchar(10) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `location` varchar(100) DEFAULT NULL
) ;

--
-- Dumping data for table `course_schedule`
--

INSERT INTO `course_schedule` (`schedule_id`, `course_id`, `day_of_week`, `start_time`, `end_time`, `location`) VALUES
(3, 2, 'Tuesday', '11:00:00', '12:30:00', 'Room 202'),
(4, 2, 'Thursday', '11:00:00', '12:30:00', 'Room 202'),
(5, 3, 'Monday', '14:00:00', '15:30:00', 'Room 303'),
(6, 3, 'Wednesday', '14:00:00', '15:30:00', 'Room 303'),
(7, 4, 'Tuesday', '16:00:00', '17:30:00', 'Room 404'),
(8, 4, 'Thursday', '16:00:00', '17:30:00', 'Room 404'),
(9, 5, 'Monday', '10:00:00', '11:30:00', 'Lab A'),
(10, 5, 'Friday', '10:00:00', '11:30:00', 'Lab A'),
(11, 6, 'Wednesday', '13:00:00', '14:30:00', 'Lab B'),
(12, 7, 'Tuesday', '09:00:00', '10:30:00', 'Room 505'),
(13, 7, 'Thursday', '09:00:00', '10:30:00', 'Room 505'),
(14, 8, 'Monday', '15:00:00', '16:30:00', 'Room 606'),
(15, 8, 'Wednesday', '15:00:00', '16:30:00', 'Room 606'),
(16, 9, 'Tuesday', '14:00:00', '15:30:00', 'Lab C'),
(17, 9, 'Thursday', '14:00:00', '15:30:00', 'Lab C'),
(23, 1, 'Monday', '09:00:00', '11:30:00', 'Room 102'),
(24, 10, 'Monday', '09:00:00', '12:00:00', 'Room 305'),
(27, 15, 'Friday', '12:10:00', '14:10:00', 'Room 302'),
(28, 14, 'Wednesday', '14:30:00', '17:00:00', 'Room 211, 2 MetroTech'),
(29, 17, 'Tuesday', '17:00:00', '19:30:00', 'Room 315 6 Mt'),
(30, 18, 'Wednesday', '10:00:00', '11:30:00', 'Test Room');

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `dept_id` int(11) NOT NULL,
  `dept_name` varchar(100) NOT NULL,
  `dept_code` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `department`
--

INSERT INTO `department` (`dept_id`, `dept_name`, `dept_code`, `created_at`) VALUES
(1, 'Computer Science', 'CS', '2025-11-19 05:03:04'),
(2, 'Electrical Engineering', 'EE', '2025-11-19 05:03:04'),
(3, 'Mechanical Engineering', 'ME', '2025-11-19 05:03:04'),
(4, 'Mathematics', 'MATH', '2025-11-19 05:03:04'),
(5, 'Physics', 'PHYS', '2025-11-19 05:03:04'),
(6, 'Business Administration', 'BA', '2025-11-19 05:03:04');

-- --------------------------------------------------------

--
-- Table structure for table `enrollment`
--

CREATE TABLE `enrollment` (
  `enrollment_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `course_id` bigint(20) NOT NULL,
  `round_id` int(11) NOT NULL,
  `bid_id` bigint(20) DEFAULT NULL,
  `enrollment_date` timestamp NULL DEFAULT current_timestamp(),
  `grade` varchar(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `enrollment`
--

INSERT INTO `enrollment` (`enrollment_id`, `student_id`, `course_id`, `round_id`, `bid_id`, `enrollment_date`, `grade`) VALUES
(14, 1, 18, 16, 24, '2025-11-25 04:14:30', NULL),
(15, 3, 18, 16, 26, '2025-11-25 04:14:30', NULL),
(16, 2, 18, 16, 25, '2025-11-25 04:14:30', NULL);

--
-- Triggers `enrollment`
--
DELIMITER $$
CREATE TRIGGER `after_enrollment_delete` AFTER DELETE ON `enrollment` FOR EACH ROW BEGIN
    UPDATE course 
    SET enrolled = enrolled - 1 
    WHERE course_id = OLD.course_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_enrollment_insert` AFTER INSERT ON `enrollment` FOR EACH ROW BEGIN
    UPDATE course 
    SET enrolled = enrolled + 1 
    WHERE course_id = NEW.course_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `Instructor`
--

CREATE TABLE `Instructor` (
  `instructor_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `dept_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Instructor`
--

INSERT INTO `Instructor` (`instructor_id`, `name`, `email`, `dept_id`) VALUES
(1, 'Dr. Sarah Mitchell', 'sarah.m@university.edu', 1),
(2, 'Prof. John Davis', 'john.d@university.edu', 2),
(3, 'Dr. Emily White', 'emily.w@university.edu', 3),
(4, 'Prof. Robert Brown', 'robert.b@university.edu', 4),
(5, 'Dr. Lisa Anderson', 'lisa.a@university.edu', 5),
(6, 'Prof. David Wilson', 'david.w@university.edu', 6),
(7, 'Dr. Karen Taylor', 'karen.t@university.edu', 7),
(8, 'Prof. James Martinez', 'james.m@university.edu', 8),
(9, 'Dr. Patricia Garcia', 'patricia.g@university.edu', 9),
(10, 'Prof. Christopher Lee', 'christopher.l@university.edu', 10),
(11, 'Dr. Jennifer Kim', 'jennifer.k@university.edu', 11),
(12, 'Prof. Andrew Chen', 'andrew.c@university.edu', 1),
(13, 'Dr. Amanda Fox', 'amanda.f@university.edu', 1);

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `notification_id` bigint(20) NOT NULL,
  `student_id` bigint(20) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(20) NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `related_bid_id` bigint(20) DEFAULT NULL,
  `related_course_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`notification_id`, `student_id`, `title`, `message`, `type`, `is_read`, `related_bid_id`, `related_course_id`, `created_at`) VALUES
(1, NULL, 'New Course Added', 'Course Test has been added.', 'info', 0, NULL, NULL, '2025-11-19 16:53:57'),
(2, 1, 'New Course Added', 'Course Test has been added.', 'info', 1, NULL, NULL, '2025-11-19 16:53:57'),
(3, 2, 'New Course Added', 'Course Test has been added.', 'info', 1, NULL, NULL, '2025-11-19 16:53:57'),
(4, 3, 'New Course Added', 'Course Test has been added.', 'info', 0, NULL, NULL, '2025-11-19 16:53:57'),
(5, 4, 'New Course Added', 'Course Test has been added.', 'info', 0, NULL, NULL, '2025-11-19 16:53:57'),
(6, 5, 'New Course Added', 'Course Test has been added.', 'info', 0, NULL, NULL, '2025-11-19 16:53:57'),
(8, 7, 'New Course Added', 'Course Test has been added.', 'info', 0, NULL, NULL, '2025-11-19 16:53:57'),
(9, 8, 'New Course Added', 'Course Test has been added.', 'info', 0, NULL, NULL, '2025-11-19 16:53:57'),
(10, NULL, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 16:56:53'),
(11, 1, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 16:56:53'),
(12, 2, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 16:56:53'),
(13, 3, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 16:56:53'),
(14, 4, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 16:56:53'),
(15, 5, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 16:56:53'),
(17, 7, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 16:56:53'),
(18, 8, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 16:56:53'),
(20, NULL, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 17:07:54'),
(21, 1, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 17:07:54'),
(22, 2, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 17:07:54'),
(23, 3, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 17:07:54'),
(24, 4, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 17:07:54'),
(25, 5, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 17:07:54'),
(27, 7, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 17:07:54'),
(28, 8, 'New Student Added', 'A new student Vikram has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 17:07:54'),
(31, NULL, 'New Course Added', 'Course java has been added.', 'info', 0, NULL, NULL, '2025-11-19 17:47:03'),
(32, 1, 'New Course Added', 'Course java has been added.', 'info', 1, NULL, NULL, '2025-11-19 17:47:03'),
(33, 2, 'New Course Added', 'Course java has been added.', 'info', 1, NULL, NULL, '2025-11-19 17:47:03'),
(34, 3, 'New Course Added', 'Course java has been added.', 'info', 0, NULL, NULL, '2025-11-19 17:47:03'),
(35, 4, 'New Course Added', 'Course java has been added.', 'info', 0, NULL, NULL, '2025-11-19 17:47:03'),
(36, 5, 'New Course Added', 'Course java has been added.', 'info', 0, NULL, NULL, '2025-11-19 17:47:03'),
(38, 7, 'New Course Added', 'Course java has been added.', 'info', 0, NULL, NULL, '2025-11-19 17:47:03'),
(39, 8, 'New Course Added', 'Course java has been added.', 'info', 0, NULL, NULL, '2025-11-19 17:47:03'),
(42, NULL, 'New Course Added', 'Course Test Course has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:14:37'),
(43, 1, 'New Course Added', 'Course Test Course has been added.', 'info', 1, NULL, NULL, '2025-11-19 18:14:37'),
(44, 2, 'New Course Added', 'Course Test Course has been added.', 'info', 1, NULL, NULL, '2025-11-19 18:14:37'),
(45, 3, 'New Course Added', 'Course Test Course has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:14:37'),
(46, 4, 'New Course Added', 'Course Test Course has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:14:38'),
(47, 5, 'New Course Added', 'Course Test Course has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:14:38'),
(49, 7, 'New Course Added', 'Course Test Course has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:14:38'),
(50, 8, 'New Course Added', 'Course Test Course has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:14:38'),
(53, NULL, 'New Course Added', 'Course DBMS has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:45:27'),
(54, 1, 'New Course Added', 'Course DBMS has been added.', 'info', 1, NULL, NULL, '2025-11-19 18:45:27'),
(55, 2, 'New Course Added', 'Course DBMS has been added.', 'info', 1, NULL, NULL, '2025-11-19 18:45:27'),
(56, 3, 'New Course Added', 'Course DBMS has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:45:27'),
(57, 4, 'New Course Added', 'Course DBMS has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:45:28'),
(58, 5, 'New Course Added', 'Course DBMS has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:45:28'),
(60, 7, 'New Course Added', 'Course DBMS has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:45:28'),
(61, 8, 'New Course Added', 'Course DBMS has been added.', 'info', 0, NULL, NULL, '2025-11-19 18:45:28'),
(64, NULL, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:17:47'),
(65, 1, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 19:17:47'),
(66, 2, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 19:17:47'),
(67, 3, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:17:47'),
(68, 4, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:17:47'),
(69, 5, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:17:47'),
(71, 7, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:17:48'),
(72, 8, 'New Student Added', 'A new student dev salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:17:48'),
(76, NULL, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:26:59'),
(77, 1, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-19 19:26:59'),
(78, 2, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-19 19:26:59'),
(79, 3, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:26:59'),
(80, 4, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:26:59'),
(81, 5, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:26:59'),
(83, 7, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:26:59'),
(84, 8, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:26:59'),
(87, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:27:30'),
(88, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-19 19:27:30'),
(89, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-19 19:27:30'),
(90, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:27:30'),
(91, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:27:30'),
(92, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:27:30'),
(94, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:27:30'),
(95, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:27:30'),
(98, NULL, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:28:17'),
(99, 1, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-19 19:28:17'),
(100, 2, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-19 19:28:17'),
(101, 3, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:28:17'),
(102, 4, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:28:17'),
(103, 5, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:28:17'),
(105, 7, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:28:17'),
(106, 8, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 19:28:17'),
(108, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:28:31'),
(109, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-19 19:28:31'),
(110, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-19 19:28:31'),
(111, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:28:31'),
(112, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:28:31'),
(113, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:28:31'),
(115, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:28:31'),
(116, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 19:28:31'),
(118, NULL, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:29:20'),
(119, 1, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 19:29:20'),
(120, 2, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 1, NULL, NULL, '2025-11-19 19:29:20'),
(121, 3, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:29:20'),
(122, 4, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:29:20'),
(123, 5, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:29:20'),
(125, 7, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:29:20'),
(126, 8, 'New Student Added', 'A new student john cena has been added to the system.', 'info', 0, NULL, NULL, '2025-11-19 19:29:20'),
(129, NULL, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-19 21:35:03'),
(130, 1, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-19 21:35:03'),
(131, 2, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-19 21:35:03'),
(132, 3, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-19 21:35:03'),
(133, 4, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-19 21:35:03'),
(134, 5, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-19 21:35:03'),
(136, 7, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-19 21:35:03'),
(137, 8, 'New Round Created: R3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-19 21:35:03'),
(140, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 23:35:08'),
(141, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-19 23:35:08'),
(142, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-19 23:35:08'),
(143, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 23:35:08'),
(144, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 23:35:08'),
(145, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 23:35:08'),
(147, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 23:35:08'),
(148, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-19 23:35:08'),
(151, NULL, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 23:35:27'),
(152, 1, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-19 23:35:27'),
(153, 2, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-19 23:35:27'),
(154, 3, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 23:35:27'),
(155, 4, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 23:35:27'),
(156, 5, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 23:35:27'),
(158, 7, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 23:35:27'),
(159, 8, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-19 23:35:27'),
(161, NULL, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 0, NULL, NULL, '2025-11-20 00:08:23'),
(162, 1, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 1, NULL, NULL, '2025-11-20 00:08:23'),
(163, 2, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 1, NULL, NULL, '2025-11-20 00:08:23'),
(164, 3, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 0, NULL, NULL, '2025-11-20 00:08:23'),
(165, 4, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 0, NULL, NULL, '2025-11-20 00:08:23'),
(166, 5, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 0, NULL, NULL, '2025-11-20 00:08:23'),
(168, 7, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 0, NULL, NULL, '2025-11-20 00:08:23'),
(169, 8, 'System Notification', 'Round 1 - Fall 2025 has ended. Waiting for results to be published.', 'info', 0, NULL, NULL, '2025-11-20 00:08:23'),
(171, NULL, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 00:36:45'),
(172, 1, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 1, NULL, NULL, '2025-11-20 00:36:45'),
(173, 2, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 1, NULL, NULL, '2025-11-20 00:36:45'),
(174, 3, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 00:36:45'),
(175, 4, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 00:36:45'),
(176, 5, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 00:36:45'),
(178, 7, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 00:36:45'),
(179, 8, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 00:36:45'),
(181, NULL, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 0, NULL, NULL, '2025-11-20 00:48:42'),
(182, 1, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 1, NULL, NULL, '2025-11-20 00:48:42'),
(183, 2, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 1, NULL, NULL, '2025-11-20 00:48:42'),
(184, 3, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 0, NULL, NULL, '2025-11-20 00:48:42'),
(185, 4, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 0, NULL, NULL, '2025-11-20 00:48:42'),
(186, 5, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 0, NULL, NULL, '2025-11-20 00:48:42'),
(188, 7, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 0, NULL, NULL, '2025-11-20 00:48:42'),
(189, 8, 'Round Started: Round 2 - Fall 2025', 'Bidding round has been activated. Start placing your bids now!', 'info', 0, NULL, NULL, '2025-11-20 00:48:42'),
(191, NULL, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 00:51:47'),
(192, 1, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-20 00:51:47'),
(193, 2, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-20 00:51:47'),
(194, 3, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 00:51:47'),
(195, 4, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 00:51:47'),
(196, 5, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 00:51:47'),
(198, 7, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 00:51:47'),
(199, 8, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 00:51:47'),
(200, 1, '? Bid Won!', 'Congratulations! You won your bid for Corporate Finance with 20 points. The course has been added to your enrollment.', 'bid_result', 1, NULL, 10, '2025-11-20 04:27:25'),
(201, NULL, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 04:27:25'),
(202, 1, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-20 04:27:25'),
(203, 2, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-20 04:27:25'),
(204, 3, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 04:27:25'),
(205, 4, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 04:27:25'),
(206, 5, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 04:27:25'),
(208, 7, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 04:27:25'),
(209, 8, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 04:27:25'),
(210, NULL, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 06:21:17'),
(211, 1, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-20 06:21:17'),
(212, 2, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-20 06:21:17'),
(213, 3, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 06:21:17'),
(214, 4, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 06:21:17'),
(215, 5, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 06:21:17'),
(217, 7, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 06:21:17'),
(218, 8, 'New Round Created: Round 1 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 06:21:17'),
(219, NULL, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 06:23:52'),
(220, 1, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 1, NULL, NULL, '2025-11-20 06:23:52'),
(221, 2, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 1, NULL, NULL, '2025-11-20 06:23:52'),
(222, 3, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 06:23:52'),
(223, 4, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 06:23:52'),
(224, 5, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 06:23:52'),
(226, 7, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 06:23:52'),
(227, 8, 'System Notification', 'Round 1 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-20 06:23:52'),
(228, NULL, 'New Course Added', 'Course Intro to Java has been added.', 'info', 0, NULL, NULL, '2025-11-20 14:10:47'),
(229, 1, 'New Course Added', 'Course Intro to Java has been added.', 'info', 1, NULL, NULL, '2025-11-20 14:10:48'),
(230, 2, 'New Course Added', 'Course Intro to Java has been added.', 'info', 1, NULL, NULL, '2025-11-20 14:10:48'),
(231, 3, 'New Course Added', 'Course Intro to Java has been added.', 'info', 0, NULL, NULL, '2025-11-20 14:10:48'),
(232, 4, 'New Course Added', 'Course Intro to Java has been added.', 'info', 0, NULL, NULL, '2025-11-20 14:10:48'),
(233, 5, 'New Course Added', 'Course Intro to Java has been added.', 'info', 0, NULL, NULL, '2025-11-20 14:10:48'),
(235, 7, 'New Course Added', 'Course Intro to Java has been added.', 'info', 0, NULL, NULL, '2025-11-20 14:10:48'),
(236, 8, 'New Course Added', 'Course Intro to Java has been added.', 'info', 0, NULL, NULL, '2025-11-20 14:10:48'),
(237, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:12:25'),
(238, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-20 14:12:25'),
(239, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-20 14:12:25'),
(240, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:12:25'),
(241, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:12:25'),
(242, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:12:25'),
(244, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:12:25'),
(245, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:12:25'),
(246, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:39:21'),
(247, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-20 14:39:21'),
(248, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-20 14:39:21'),
(249, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:39:21'),
(250, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:39:21'),
(251, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:39:22'),
(253, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:39:22'),
(254, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-20 14:39:22'),
(255, NULL, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 14:39:37'),
(256, 1, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-20 14:39:37'),
(257, 2, 'Student Deleted', 'A student has been removed from the system.', 'info', 1, NULL, NULL, '2025-11-20 14:39:37'),
(258, 3, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 14:39:37'),
(259, 4, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 14:39:37'),
(260, 5, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 14:39:37'),
(261, 7, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 14:39:37'),
(262, 8, 'Student Deleted', 'A student has been removed from the system.', 'info', 0, NULL, NULL, '2025-11-20 14:39:37'),
(263, NULL, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-20 14:41:39'),
(264, 1, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 1, NULL, NULL, '2025-11-20 14:41:39'),
(265, 2, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 1, NULL, NULL, '2025-11-20 14:41:39'),
(266, 3, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-20 14:41:39'),
(267, 4, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-20 14:41:39'),
(268, 5, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-20 14:41:39'),
(269, 7, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-20 14:41:39'),
(270, 8, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-20 14:41:39'),
(271, 15, 'New Student Added', 'A new student Dev Salvi has been added to the system.', 'info', 0, NULL, NULL, '2025-11-20 14:41:39'),
(272, NULL, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 15:12:16'),
(273, 1, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-20 15:12:16'),
(274, 2, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-20 15:12:16'),
(275, 3, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 15:12:16'),
(276, 4, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 15:12:16'),
(277, 5, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 15:12:16'),
(278, 7, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 15:12:16'),
(279, 8, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 15:12:16'),
(280, 15, 'New Round Created: Round 2 - Fall 2025', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-20 15:12:16'),
(283, 1, '? Bid Won!', 'Congratulations! You won your bid for DBMS with 20 points. The course has been added to your enrollment.', 'bid_result', 1, NULL, 14, '2025-11-20 16:03:17'),
(284, 15, '? Bid Won!', 'Congratulations! You won your bid for Intro to Java with 25 points. The course has been added to your enrollment.', 'bid_result', 0, NULL, 15, '2025-11-20 16:03:17'),
(285, 1, '❌ Bid Not Successful', 'Unfortunately, your bid for Intro to Java (15 points) was not successful. Your 15 points have been refunded to your wallet.', 'bid_result', 1, NULL, 15, '2025-11-20 16:03:17'),
(286, NULL, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 16:03:17'),
(287, 1, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-20 16:03:17'),
(288, 2, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-20 16:03:17'),
(289, 3, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 16:03:17'),
(290, 4, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 16:03:17'),
(291, 5, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 16:03:17'),
(292, 7, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 16:03:17'),
(293, 8, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 16:03:17'),
(294, 15, 'Round Processed: Round 1 - Fall 2025', 'Round 1 - Fall 2025 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-20 16:03:17'),
(295, NULL, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-21 00:47:32'),
(296, 5, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-21 00:47:32'),
(297, 1, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 1, NULL, NULL, '2025-11-21 00:47:32'),
(298, 2, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 1, NULL, NULL, '2025-11-21 00:47:32'),
(299, 3, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-21 00:47:32'),
(300, 15, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-21 00:47:32'),
(301, 4, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-21 00:47:32'),
(302, 7, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-21 00:47:32'),
(303, 8, 'System Notification', 'Round 2 - Fall 2025 has started! You can now place your bids.', 'info', 0, NULL, NULL, '2025-11-21 00:47:32'),
(304, 1, 'Bid Placed Successfully', 'Your bid of 20 points for BA302 has been placed.', 'success', 1, NULL, NULL, '2025-11-21 00:47:49'),
(305, 1, 'Bid Placed Successfully', 'Your bid of 25 points for CS101 has been placed.', 'success', 1, NULL, NULL, '2025-11-21 19:19:47'),
(306, 1, 'Bid Placed Successfully', 'Your bid of 40 points for CS301 has been placed.', 'success', 1, NULL, NULL, '2025-11-21 19:19:47'),
(307, NULL, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 15:58:31'),
(308, 1, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 15:58:31'),
(309, 2, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 15:58:31'),
(310, 3, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 15:58:31'),
(311, 4, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 15:58:31'),
(312, 5, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 15:58:31'),
(313, 7, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 15:58:31'),
(314, 8, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 15:58:31'),
(315, 15, 'New Round Created: Third Round', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 15:58:31'),
(316, NULL, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 15:58:46'),
(317, 1, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-22 15:58:46'),
(318, 2, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-22 15:58:46'),
(319, 3, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 15:58:46'),
(320, 4, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 15:58:46'),
(321, 5, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 15:58:46'),
(322, 7, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 15:58:46'),
(323, 8, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 15:58:46'),
(324, 15, 'Round Processed: Third Round', 'Third Round has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 15:58:46'),
(325, NULL, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:10:36'),
(326, 1, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 16:10:36'),
(327, 2, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 16:10:36'),
(328, 3, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:10:36'),
(329, 4, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:10:36'),
(330, 5, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:10:36'),
(331, 7, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:10:36'),
(332, 8, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:10:36'),
(333, 15, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:10:36'),
(334, NULL, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:10:49'),
(335, 1, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-22 16:10:49'),
(336, 2, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-22 16:10:49'),
(337, 3, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:10:49'),
(338, 4, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:10:49'),
(339, 5, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:10:49'),
(340, 7, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:10:49'),
(341, 8, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:10:49'),
(342, 15, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:10:49'),
(343, NULL, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:34:28'),
(344, 1, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 16:34:28'),
(345, 2, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 16:34:28'),
(346, 3, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:34:28'),
(347, 4, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:34:28'),
(348, 5, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:34:28'),
(349, 7, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:34:28'),
(350, 8, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:34:28'),
(351, 15, 'New Round Created: Round 3', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:34:28'),
(352, NULL, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:37:10'),
(353, 1, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 16:37:10'),
(354, 2, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-22 16:37:10'),
(355, 3, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:37:10'),
(356, 4, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:37:10'),
(357, 5, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:37:10'),
(358, 7, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:37:10'),
(359, 8, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:37:10'),
(360, 15, 'New Round Created: Round 2', 'A new bidding round has been created. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-22 16:37:10'),
(361, NULL, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-22 16:51:11'),
(362, 1, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-22 16:51:11'),
(363, 2, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-22 16:51:11'),
(364, 3, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:51:11'),
(365, 4, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:51:11'),
(366, 5, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:51:11'),
(367, 7, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:51:11'),
(368, 8, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:51:11'),
(369, 15, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-22 16:51:11'),
(370, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:40'),
(371, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:21:40'),
(372, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:21:40'),
(373, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:40'),
(374, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:40'),
(375, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:40'),
(376, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:40'),
(377, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:40'),
(378, 15, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:40'),
(379, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:52'),
(380, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:21:52'),
(381, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:21:52'),
(382, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:52'),
(383, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:52'),
(384, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:52'),
(385, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:52'),
(386, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:52'),
(387, 15, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:21:52'),
(388, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:00'),
(389, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:22:00'),
(390, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:22:00'),
(391, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:00'),
(392, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:00'),
(393, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:00'),
(394, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:00'),
(395, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:00'),
(396, 15, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:00'),
(397, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:09'),
(398, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:22:09'),
(399, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:22:09'),
(400, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:09'),
(401, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:09'),
(402, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:09'),
(403, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:09'),
(404, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:09'),
(405, 15, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:09'),
(406, NULL, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:50'),
(407, 1, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:22:50'),
(408, 2, 'Student Updated', 'Student information has been updated.', 'info', 1, NULL, NULL, '2025-11-23 17:22:50'),
(409, 3, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:50'),
(410, 4, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:50'),
(411, 5, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:50'),
(412, 7, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:50'),
(413, 8, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:50'),
(414, 15, 'Student Updated', 'Student information has been updated.', 'info', 0, NULL, NULL, '2025-11-23 17:22:50'),
(416, 1, 'Bid Cancelled', 'Your bid for DBMS has been cancelled. 20 points have been refunded to your wallet.', 'info', 1, NULL, 14, '2025-11-23 18:41:48'),
(417, NULL, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(418, 1, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(419, 2, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 1, NULL, NULL, '2025-11-23 18:55:31'),
(420, 3, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(421, 4, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(422, 5, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(423, 7, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(424, 8, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(425, 15, 'New Course Added', 'Course Cloud Computing has been added.', 'info', 0, NULL, NULL, '2025-11-23 18:55:31'),
(426, NULL, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(427, 1, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(428, 2, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-24 01:47:32');
INSERT INTO `notification` (`notification_id`, `student_id`, `title`, `message`, `type`, `is_read`, `related_bid_id`, `related_course_id`, `created_at`) VALUES
(429, 3, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(430, 4, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(431, 5, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(432, 7, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(433, 8, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(434, 15, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:47:32'),
(435, NULL, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(436, 1, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(437, 2, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-24 01:50:07'),
(438, 3, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(439, 4, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(440, 5, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(441, 7, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(442, 8, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(443, 15, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 01:50:07'),
(444, NULL, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(445, 1, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(446, 2, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 1, NULL, NULL, '2025-11-24 02:00:47'),
(447, 3, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(448, 4, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(449, 5, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(450, 7, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(451, 8, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(452, 15, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-24 02:00:47'),
(453, 3, '🎉 Bid Won!', 'Congratulations! You won your bid for Corporate Finance New with 20 points. The course has been added to your enrollment.', 'bid_result', 0, NULL, 10, '2025-11-24 02:10:21'),
(454, 3, '🎉 Bid Won!', 'Congratulations! You won your bid for Database Systems with 20 points. The course has been added to your enrollment.', 'bid_result', 0, NULL, 3, '2025-11-24 02:10:21'),
(455, 2, '🎉 Bid Won!', 'Congratulations! You won your bid for DBMS with 30 points. The course has been added to your enrollment.', 'bid_result', 1, NULL, 14, '2025-11-24 02:10:21'),
(456, 2, '🎉 Bid Won!', 'Congratulations! You won your bid for Machine Learning with 30 points. The course has been added to your enrollment.', 'bid_result', 1, NULL, 4, '2025-11-24 02:10:21'),
(457, NULL, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(458, 1, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(459, 2, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 1, NULL, NULL, '2025-11-24 02:10:21'),
(460, 3, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(461, 4, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(462, 5, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(463, 7, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(464, 8, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(465, 15, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-24 02:10:21'),
(466, NULL, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(467, 1, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(468, 2, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 1, NULL, NULL, '2025-11-24 04:31:49'),
(469, 3, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(470, 4, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(471, 5, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(472, 7, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(473, 8, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(474, 15, 'Waitlist Update', 'A seat has opened up in Machine Learning. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:31:49'),
(475, NULL, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(476, 1, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(477, 2, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 1, NULL, NULL, '2025-11-24 04:42:45'),
(478, 3, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(479, 4, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(480, 5, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(481, 7, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(482, 8, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(483, 15, 'Waitlist Update', 'A seat has opened up in DBMS. Eligible students have been automatically enrolled from the waitlist.', 'info', 0, NULL, NULL, '2025-11-24 04:42:45'),
(484, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(485, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(486, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(487, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(488, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(489, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(490, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(491, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(492, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:36:46'),
(493, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(494, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(495, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(496, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(497, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(498, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(499, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(500, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(501, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:43:40'),
(502, NULL, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(503, 1, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(504, 2, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(505, 3, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(506, 4, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(507, 5, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(508, 7, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(509, 8, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(510, 15, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:55:29'),
(511, NULL, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(512, 1, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(513, 2, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(514, 3, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(515, 4, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(516, 5, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(517, 7, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(518, 8, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(519, 15, 'New Bidding Round Created', 'Round 1 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 03:58:20'),
(520, NULL, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(521, 1, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(522, 2, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(523, 3, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(524, 4, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(525, 5, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(526, 7, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(527, 8, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(528, 15, 'New Course Available', 'Course Test Course  (CSTT) has been added to the catalog.', 'info', 0, NULL, NULL, '2025-11-25 03:59:55'),
(529, 7, '❌ Bid Not Successful', 'Unfortunately, your bid for Test Course  (20 points) was not successful. Your 20 points have been refunded to your wallet.', 'bid_result', 0, 27, 18, '2025-11-25 04:14:30'),
(530, 3, '🎉 Bid Won!', 'Congratulations! You won your bid for Test Course  with 40 points. The course has been added to your enrollment.', 'bid_result', 0, 26, 18, '2025-11-25 04:14:30'),
(531, 2, '🎉 Bid Won!', 'Congratulations! You won your bid for Test Course  with 35 points. The course has been added to your enrollment.', 'bid_result', 0, 25, 18, '2025-11-25 04:14:30'),
(532, 1, '🎉 Bid Won!', 'Congratulations! You won your bid for Test Course  with 40 points. The course has been added to your enrollment.', 'bid_result', 0, 24, 18, '2025-11-25 04:14:30'),
(533, NULL, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(534, 1, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(535, 2, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(536, 3, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(537, 4, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(538, 5, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(539, 7, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(540, 8, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(541, 15, 'Round Processed: Round 1', 'Round 1 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:14:30'),
(542, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(543, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(544, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(545, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(546, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(547, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(548, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(549, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(550, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:17:59'),
(551, NULL, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(552, 1, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(553, 2, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(554, 3, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(555, 4, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(556, 5, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(557, 7, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(558, 8, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(559, 15, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:36:24'),
(560, NULL, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(561, 1, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(562, 2, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(563, 3, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(564, 4, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(565, 5, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(566, 7, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(567, 8, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(568, 15, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(569, NULL, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(570, 1, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(571, 2, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(572, 3, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(573, 4, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(574, 5, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(575, 7, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(576, 8, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(577, 15, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:46:15'),
(578, NULL, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(579, 1, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(580, 2, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(581, 3, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(582, 4, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(583, 5, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(584, 7, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(585, 8, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(586, 15, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:46:36'),
(587, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(588, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(589, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(590, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(591, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(592, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(593, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(594, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(595, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:47:37'),
(596, NULL, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(597, 1, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(598, 2, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(599, 3, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(600, 4, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(601, 5, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(602, 7, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(603, 8, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(604, 15, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:48:15'),
(605, NULL, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(606, 1, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(607, 2, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(608, 3, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(609, 4, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(610, 5, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(611, 7, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(612, 8, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(613, 15, 'Round Processed: Round 2', 'Round 2 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:54:57'),
(614, NULL, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(615, 1, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(616, 2, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(617, 3, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(618, 4, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(619, 5, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(620, 7, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(621, 8, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(622, 15, 'New Bidding Round Created', 'Round 3 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:55:20'),
(623, NULL, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(624, 1, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(625, 2, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(626, 3, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(627, 4, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(628, 5, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(629, 7, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(630, 8, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(631, 15, '⏱️ Round Closed: Round 3', 'Bidding has ended for Round 3. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:56:38'),
(632, NULL, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(633, 1, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(634, 2, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(635, 3, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(636, 4, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(637, 5, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(638, 7, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(639, 8, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(640, 15, 'Round Processed: Round 3', 'Round 3 has been processed. Check your bids to see the results!', 'info', 0, NULL, NULL, '2025-11-25 04:57:13'),
(641, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(642, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(643, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(644, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(645, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(646, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(647, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(648, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(649, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 04:57:48'),
(650, NULL, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(651, 1, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(652, 2, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(653, 3, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(654, 4, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(655, 5, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(656, 7, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(657, 8, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(658, 15, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:58:38'),
(659, NULL, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(660, 1, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(661, 2, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(662, 3, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(663, 4, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(664, 5, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(665, 7, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(666, 8, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(667, 15, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 04:59:38'),
(668, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(669, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(670, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(671, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(672, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(673, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(674, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(675, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(676, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:09'),
(677, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(678, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(679, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(680, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(681, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(682, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(683, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(684, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(685, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:00:52'),
(686, NULL, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(687, 1, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(688, 2, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(689, 3, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(690, 4, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(691, 5, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(692, 7, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(693, 8, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(694, 15, '⏱️ Round Closed: Round 2', 'Bidding has ended for Round 2. Results will be published soon by the admin.', 'info', 0, NULL, NULL, '2025-11-25 05:03:38'),
(695, NULL, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(696, 1, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(697, 2, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(698, 3, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(699, 4, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(700, 5, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(701, 7, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(702, 8, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47'),
(703, 15, 'New Bidding Round Created', 'Round 2 has been scheduled. Get ready to place your bids!', 'info', 0, NULL, NULL, '2025-11-25 05:06:47');

-- --------------------------------------------------------

--
-- Table structure for table `round`
--

CREATE TABLE `round` (
  `round_id` int(11) NOT NULL,
  `round_number` int(11) NOT NULL,
  `round_name` varchar(50) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `end_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `round`
--

INSERT INTO `round` (`round_id`, `round_number`, `round_name`, `start_time`, `end_time`, `status`, `processed_at`, `created_at`, `updated_at`) VALUES
(16, 1, 'Round 1', '2025-11-25 04:14:30', '2025-11-24 09:00:00', 'closed', '2025-11-25 04:14:30', '2025-11-25 03:58:20', '2025-11-25 04:14:30'),
(24, 2, 'Round 2', '2025-11-24 10:06:00', '2025-11-25 21:10:00', 'active', NULL, '2025-11-25 05:06:47', '2025-11-25 05:07:34');

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE `student` (
  `student_id` bigint(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'student',
  `year` int(11) DEFAULT NULL,
  `dept_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student`
--

INSERT INTO `student` (`student_id`, `name`, `email`, `password`, `role`, `year`, `dept_id`, `created_at`, `updated_at`) VALUES
(1, 'Alice Johnson', 'alice@nyu.edu', '$2a$10$4wYaugyfKsmIhTTC948qv.wq7trmx7XzmDiCyeoWmH2b7ALKgefD.', 'student', 3, 2, '2025-11-19 05:03:04', '2025-11-19 19:27:30'),
(2, 'Bob Smith', 'bob@nyu.edu', '$2a$10$IOGlEzHw8rcWufhTC8DCdOCHpItozXPvGTZ7BEvTo9z0ylcu2aOd2', 'student', 4, 1, '2025-11-19 05:03:04', '2025-11-23 17:21:40'),
(3, 'Charlie Davis', 'charlie@nyu.edu', '$2a$10$wQymeU60g2fIMSd2wQtVZuGLQ6OuKQHt8TWki2nAYYIVAfG//fQOK', 'student', 4, 2, '2025-11-19 05:03:04', '2025-11-23 17:21:52'),
(4, 'Diana Prince', 'diana@nyu.edu', '$2a$10$4sqqxyGwi8K7d3efDCF4ueOICCbfzcg2z39FtCtvZihN2B0KRKCp2', 'student', 1, 3, '2025-11-19 05:03:04', '2025-11-25 04:00:18'),
(5, 'Admin User', 'admin@nyu.edu', '$2a$10$AMSapcIwO7l79aJvP.ed3uS2ccvUqXBe64xkTPSGVu7cc5FwRMoLa', 'admin', NULL, NULL, '2025-11-19 05:03:04', '2025-11-19 14:32:08'),
(7, 'John Cena Sr', 'john123@wwe.com', '$2a$10$Ng8gMlE58l9PdS2BSMsd0.R/k5fn.5TCrODpP/Kh9uvTQmCDQPNvW', 'student', 1, 3, '2025-11-19 14:31:29', '2025-11-25 04:00:28'),
(8, 'TempAdmin', 'tempadmin@nyu.edu', '$2a$10$AMSapcIwO7l79aJvP.ed3uS2ccvUqXBe64xkTPSGVu7cc5FwRMoLa', 'admin', 1, 1, '2025-11-19 14:31:39', '2025-11-19 14:31:39'),
(15, 'Dev Salvi', 'dev@nyu.edu', '$2a$10$8djau4jT8czwrIQwIAO7ZO8.qoOIQvChmuXhOquyLAA4qFPbKynFG', 'student', 1, 6, '2025-11-20 14:41:39', '2025-11-23 17:22:50');

--
-- Triggers `student`
--
DELIMITER $$
CREATE TRIGGER `after_student_insert` AFTER INSERT ON `student` FOR EACH ROW BEGIN
    IF NEW.role = 'student' THEN
        INSERT INTO wallet (student_id, balance) 
        VALUES (NEW.student_id, 100);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `waitlist`
--

CREATE TABLE `waitlist` (
  `waitlist_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `course_id` bigint(20) NOT NULL,
  `position` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `waitlist`
--

INSERT INTO `waitlist` (`waitlist_id`, `student_id`, `course_id`, `position`, `created_at`) VALUES
(2, 7, 18, 1, '2025-11-25 04:14:30');

-- --------------------------------------------------------

--
-- Table structure for table `wallet`
--

CREATE TABLE `wallet` (
  `wallet_id` bigint(20) NOT NULL,
  `student_id` bigint(20) NOT NULL,
  `balance` int(11) NOT NULL DEFAULT 100,
  `total_spent` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `wallet`
--

INSERT INTO `wallet` (`wallet_id`, `student_id`, `balance`, `total_spent`, `created_at`, `updated_at`) VALUES
(1, 1, 60, 407, '2025-11-19 05:03:04', '2025-11-25 04:02:25'),
(2, 2, 65, 130, '2025-11-19 05:03:04', '2025-11-25 04:03:01'),
(3, 3, 60, 140, '2025-11-19 05:03:04', '2025-11-25 04:03:43'),
(4, 4, 100, 0, '2025-11-19 05:03:04', '2025-11-19 05:03:04'),
(6, 7, 100, 20, '2025-11-19 14:31:29', '2025-11-25 04:14:30'),
(11, 15, 75, 25, '2025-11-20 14:41:39', '2025-11-20 14:43:48');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Auction_Round`
--
ALTER TABLE `Auction_Round`
  ADD PRIMARY KEY (`round_id`);

--
-- Indexes for table `bid`
--
ALTER TABLE `bid`
  ADD PRIMARY KEY (`bid_id`),
  ADD UNIQUE KEY `unique_student_course_round` (`student_id`,`course_id`,`round_id`),
  ADD KEY `idx_bid_student` (`student_id`),
  ADD KEY `idx_bid_course` (`course_id`),
  ADD KEY `idx_bid_round` (`round_id`),
  ADD KEY `idx_bid_status` (`status`);

--
-- Indexes for table `course`
--
ALTER TABLE `course`
  ADD PRIMARY KEY (`course_id`),
  ADD KEY `idx_course_dept` (`dept_id`);

--
-- Indexes for table `course_schedule`
--
ALTER TABLE `course_schedule`
  ADD PRIMARY KEY (`schedule_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`dept_id`),
  ADD UNIQUE KEY `dept_name` (`dept_name`),
  ADD UNIQUE KEY `dept_code` (`dept_code`);

--
-- Indexes for table `enrollment`
--
ALTER TABLE `enrollment`
  ADD PRIMARY KEY (`enrollment_id`),
  ADD UNIQUE KEY `unique_student_course` (`student_id`,`course_id`),
  ADD KEY `round_id` (`round_id`),
  ADD KEY `bid_id` (`bid_id`),
  ADD KEY `idx_enrollment_student` (`student_id`),
  ADD KEY `idx_enrollment_course` (`course_id`);

--
-- Indexes for table `Instructor`
--
ALTER TABLE `Instructor`
  ADD PRIMARY KEY (`instructor_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `dept_id` (`dept_id`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `related_bid_id` (`related_bid_id`),
  ADD KEY `related_course_id` (`related_course_id`),
  ADD KEY `idx_notification_student` (`student_id`),
  ADD KEY `idx_notification_read` (`is_read`);

--
-- Indexes for table `round`
--
ALTER TABLE `round`
  ADD PRIMARY KEY (`round_id`),
  ADD UNIQUE KEY `round_number` (`round_number`),
  ADD KEY `idx_round_status` (`status`);

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `dept_id` (`dept_id`),
  ADD KEY `idx_student_email` (`email`);

--
-- Indexes for table `waitlist`
--
ALTER TABLE `waitlist`
  ADD PRIMARY KEY (`waitlist_id`),
  ADD UNIQUE KEY `unique_student_course_waitlist` (`student_id`,`course_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `wallet`
--
ALTER TABLE `wallet`
  ADD PRIMARY KEY (`wallet_id`),
  ADD UNIQUE KEY `student_id` (`student_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Auction_Round`
--
ALTER TABLE `Auction_Round`
  MODIFY `round_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bid`
--
ALTER TABLE `bid`
  MODIFY `bid_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course`
--
ALTER TABLE `course`
  MODIFY `course_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_schedule`
--
ALTER TABLE `course_schedule`
  MODIFY `schedule_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `department`
--
ALTER TABLE `department`
  MODIFY `dept_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `enrollment`
--
ALTER TABLE `enrollment`
  MODIFY `enrollment_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `Instructor`
--
ALTER TABLE `Instructor`
  MODIFY `instructor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `notification_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `round`
--
ALTER TABLE `round`
  MODIFY `round_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student`
--
ALTER TABLE `student`
  MODIFY `student_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `waitlist`
--
ALTER TABLE `waitlist`
  MODIFY `waitlist_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `wallet`
--
ALTER TABLE `wallet`
  MODIFY `wallet_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bid`
--
ALTER TABLE `bid`
  ADD CONSTRAINT `bid_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bid_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bid_ibfk_3` FOREIGN KEY (`round_id`) REFERENCES `round` (`round_id`) ON DELETE CASCADE;

--
-- Constraints for table `course`
--
ALTER TABLE `course`
  ADD CONSTRAINT `course_ibfk_1` FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`);

--
-- Constraints for table `course_schedule`
--
ALTER TABLE `course_schedule`
  ADD CONSTRAINT `course_schedule_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE;

--
-- Constraints for table `enrollment`
--
ALTER TABLE `enrollment`
  ADD CONSTRAINT `enrollment_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `enrollment_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `enrollment_ibfk_3` FOREIGN KEY (`round_id`) REFERENCES `round` (`round_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `enrollment_ibfk_4` FOREIGN KEY (`bid_id`) REFERENCES `bid` (`bid_id`) ON DELETE SET NULL;

--
-- Constraints for table `Instructor`
--
ALTER TABLE `Instructor`
  ADD CONSTRAINT `instructor_ibfk_1` FOREIGN KEY (`dept_id`) REFERENCES `Department` (`dept_id`);

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notification_ibfk_2` FOREIGN KEY (`related_bid_id`) REFERENCES `bid` (`bid_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `notification_ibfk_3` FOREIGN KEY (`related_course_id`) REFERENCES `course` (`course_id`) ON DELETE SET NULL;

--
-- Constraints for table `student`
--
ALTER TABLE `student`
  ADD CONSTRAINT `student_ibfk_1` FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`) ON DELETE SET NULL;

--
-- Constraints for table `waitlist`
--
ALTER TABLE `waitlist`
  ADD CONSTRAINT `waitlist_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `waitlist_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE;

--
-- Constraints for table `wallet`
--
ALTER TABLE `wallet`
  ADD CONSTRAINT `wallet_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
