package com.project.cbs.controller;

import java.sql.Time;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.project.cbs.dto.BidResponseDto;
import com.project.cbs.dto.CourseDetailsDto;
import com.project.cbs.dto.CourseWithScheduleDto;
import com.project.cbs.dto.RoundDto;
import com.project.cbs.dto.StudentDetailsDto;
import com.project.cbs.dto.RoundWithBidsDto;
import com.project.cbs.dto.BidDetailsDto;
import com.project.cbs.model.Course;
import com.project.cbs.model.CourseSchedule;
import com.project.cbs.model.Round;
import com.project.cbs.model.Student;
import com.project.cbs.model.Department;
import com.project.cbs.model.Wallet;
import com.project.cbs.model.Bid;
import com.project.cbs.repository.*;
import com.project.cbs.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final RoundRepository roundRepository;
    private final DepartmentRepository departmentRepository;
    private final WalletRepository walletRepository;
    private final BidRepository bidRepository;
    private final RoundService roundService;
    private final NotificationService notificationService;
    private final AuctionRepository auctionRepository;

     @Autowired
    private CourseService courseService;
 
    
    @Autowired
    private BidService bidService;
    
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    private SimpleJdbcCall processAuctionWinnersProc;
    
    @PostConstruct
    public void init() {
        processAuctionWinnersProc = new SimpleJdbcCall(jdbcTemplate)
            .withProcedureName("process_auction_winners");
    }

    // ========== STUDENT MANAGEMENT ==========
    
    @PostMapping("/students")
public ResponseEntity<?> createStudent(@RequestBody Student student) {
    try {
        // Validate email doesn't already exist
        if (studentRepository.existsByEmail(student.getEmail())) {
            return ResponseEntity.badRequest().body("Email already exists");
        }
        
        // Hash password
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        student.setPassword(encoder.encode(student.getPassword()));
        student.setRole("student");
        
        // Create student
        Long studentId = studentRepository.save(student);
        log.info("Student created with ID: {}", studentId);
        
        // Check if wallet already exists (shouldn't happen, but just in case)
        if (!walletRepository.existsByStudentId(studentId)) {
            // Create wallet for new student
            Wallet wallet = new Wallet();
            wallet.setStudentId(studentId);
            wallet.setBalance(100);  // Default starting balance
            wallet.setTotalSpent(0);
            
            Long walletId = walletRepository.save(wallet);
            log.info("Wallet created for student {} with ID: {}", studentId, walletId);
        } else {
            log.warn("Wallet already exists for student {}", studentId);
        }
        
        return ResponseEntity.ok("Student created successfully with ID: " + studentId);
    } catch (Exception e) {
        log.error("Error creating student: ", e);
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}


    @GetMapping("/students")
    public ResponseEntity<?> getAllStudents() {
        try {
            List<Student> students = studentRepository.findAll();
            List<StudentDetailsDto> studentDetails = students.stream()
                .map(this::convertToStudentDetailsDto)
                .toList();
            return ResponseEntity.ok(studentDetails);
        } catch (Exception e) {
            log.error("Error fetching students: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/students/{id}")
    public ResponseEntity<?> getStudentById(@PathVariable Long id) {
        try {
            Student student = studentRepository.findById(id);
            if (student == null) {
                return ResponseEntity.badRequest().body("Student not found");
            }
            return ResponseEntity.ok(convertToStudentDetailsDto(student));
        } catch (Exception e) {
            log.error("Error fetching student: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @RequestBody Student student) {
        try {
            student.setStudentId(id);
            studentRepository.update(student);
            log.info("Student {} updated", id);
            return ResponseEntity.ok("Student updated successfully");
        } catch (Exception e) {
            log.error("Error updating student: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<?> deleteStudent(@PathVariable Long id) {
        try {
            studentRepository.delete(id);
            log.info("Student {} deleted", id);
            return ResponseEntity.ok("Student deleted successfully");
        } catch (Exception e) {
            log.error("Error deleting student: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ========== COURSE MANAGEMENT ==========

    @PostMapping("/courses")
    public ResponseEntity<?> createCourse(@RequestBody CourseWithScheduleDto courseDto) {
        try {
            Course course = new Course();
            course.setCourseCode(courseDto.getCourseCode());
            course.setCourseName(courseDto.getCourseName());
            course.setDeptId(courseDto.getDeptId());
            course.setInstructorName(courseDto.getInstructorName());
            course.setCredits(courseDto.getCredits());
            course.setCapacity(courseDto.getCapacity());
            course.setEnrolled(0);
            course.setMinBid(courseDto.getMinBid());
            course.setDescription(courseDto.getDescription());
            course.setPrerequisites(courseDto.getPrerequisites());

            Long courseId = courseRepository.save(course);

            // Save schedule if provided
            CourseSchedule schedule = new CourseSchedule();
            schedule.setCourseId(courseId);
            schedule.setDayOfWeek(courseDto.getDayOfWeek());
            schedule.setStartTime(Time.valueOf(courseDto.getStartTime() + ":00"));
            schedule.setEndTime(Time.valueOf(courseDto.getEndTime() + ":00"));
            schedule.setLocation(courseDto.getLocation());

            log.info("Course created with ID: {}", courseId);
            return ResponseEntity.ok("Course created successfully with ID: " + courseId);
        } catch (Exception e) {
            log.error("Error creating course: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/courses")
    public ResponseEntity<?> getAllCourses() {
        try {
            List<Course> courses = courseRepository.findAll();
            List<CourseDetailsDto> courseDetails = courses.stream()
                .map(this::convertToCourseDetailsDto)
                .toList();
            return ResponseEntity.ok(courseDetails);
        } catch (Exception e) {
            log.error("Error fetching courses: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Long id, @RequestBody Course course) {
        try {
            course.setCourseId(id);
            courseRepository.update(course);
            log.info("Course {} updated", id);
            return ResponseEntity.ok("Course updated successfully");
        } catch (Exception e) {
            log.error("Error updating course: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
        try {
            courseRepository.delete(id);
            log.info("Course {} deleted", id);
            return ResponseEntity.ok("Course deleted successfully");
        } catch (Exception e) {
            log.error("Error deleting course: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ========== ROUND MANAGEMENT ==========

    @PostMapping("/rounds")
    public ResponseEntity<?> createRound(@RequestBody RoundDto roundDto) {
        try {
            Round round = new Round();
            round.setRoundNumber(roundDto.getRoundNumber());
            round.setRoundName(roundDto.getRoundName());
            round.setStartTime(java.sql.Timestamp.valueOf(roundDto.getStartTime()));
            round.setEndTime(java.sql.Timestamp.valueOf(roundDto.getEndTime()));
            round.setStatus("scheduled");

            Integer roundId = roundRepository.save(round);
            log.info("Round created with ID: {}", roundId);
            return ResponseEntity.ok("Round created successfully with ID: " + roundId);
        } catch (Exception e) {
            log.error("Error creating round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/rounds")
    public ResponseEntity<?> getAllRounds() {
        try {
            List<RoundDto> rounds = roundService.getAllRounds();
            return ResponseEntity.ok(rounds);
        } catch (Exception e) {
            log.error("Error fetching rounds: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/rounds/{id}/activate")
    public ResponseEntity<?> activateRound(@PathVariable Integer id) {
        try {
            roundService.activateRound(id);
            log.info("Round {} activated", id);
            return ResponseEntity.ok("Round activated successfully");
        } catch (Exception e) {
            log.error("Error activating round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Process auction for a specific course using process_auction_winners stored procedure
     * The stored procedure handles:
     * - Determining winners based on highest bids
     * - Creating enrollment records for winners
     * - Updating course enrollment count
     * - Deducting winning bid amounts from wallets
     * - Adding losers to waitlist
     * - Updating bid statuses
     */
    @PostMapping("/rounds/{roundId}/process-course/{courseId}")
    public ResponseEntity<?> processAuctionForCourse(
            @PathVariable Integer roundId, 
            @PathVariable Integer courseId) {
        try {
            log.info("Admin processing auction for round {} and course {}", roundId, courseId);
            
            Course course = courseRepository.findById(courseId.longValue());
            if (course == null) {
                return ResponseEntity.badRequest().body("Course not found");
            }
            
            // Call process_auction_winners stored procedure
            auctionRepository.processAuctionWinners(roundId, courseId);
            
            notificationService.broadcastSystemNotification(
                "Auction Processed",
                "Winners have been determined for " + course.getCourseCode() + " - " + course.getCourseName()
            );
            
            log.info("Auction processed successfully for course {}", courseId);
            return ResponseEntity.ok("Auction processed successfully for course: " + course.getCourseCode());
        } catch (Exception e) {
            log.error("Error processing auction: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Process all courses in a round using process_auction_winners stored procedure
     */
    @PostMapping("/rounds/{id}/process-all")
    public ResponseEntity<?> processAllAuctions(@PathVariable Integer id) {
        try {
            log.info("Admin processing all auctions for round {}", id);
            
            Round round = roundRepository.findById(id);
            if (round == null) {
                return ResponseEntity.badRequest().body("Round not found");
            }
            
            if (!"active".equals(round.getStatus())) {
                return ResponseEntity.badRequest().body("Can only process active rounds");
            }
            
            // Use RoundService which calls process_auction_winners for each course
            roundService.processRound(id);
            
            log.info("All auctions processed successfully for round {}", id);
            return ResponseEntity.ok("All auctions processed successfully for round: " + round.getRoundName());
        } catch (Exception e) {
            log.error("Error processing all auctions: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/bids")
    public ResponseEntity<?> getAllBids() {
        try {
            List<BidResponseDto> bids = bidService.getAllBids();
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            log.error("Error fetching all bids: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/rounds/{id}/bids")
    public ResponseEntity<?> getBidsByRound(@PathVariable Integer id) {
        try {
            List<Bid> bids = bidRepository.findByRoundId(id);
            List<BidDetailsDto> bidDetails = bids.stream()
                .map(this::convertToBidDetailsDto)
                .toList();
            return ResponseEntity.ok(bidDetails);
        } catch (Exception e) {
            log.error("Error fetching bids: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ========== DEPARTMENT MANAGEMENT ==========

    @GetMapping("/departments")
    public ResponseEntity<?> getAllDepartments() {
        try {
            List<Department> departments = departmentRepository.findAll();
            return ResponseEntity.ok(departments);
        } catch (Exception e) {
            log.error("Error fetching departments: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ========== HELPER METHODS ==========

    private StudentDetailsDto convertToStudentDetailsDto(Student student) {
        Department dept = departmentRepository.findById(student.getDeptId());
        Wallet wallet = walletRepository.findByStudentId(student.getStudentId());
        
        StudentDetailsDto dto = new StudentDetailsDto();
        dto.setStudentId(student.getStudentId());
        dto.setName(student.getName());
        dto.setEmail(student.getEmail());
        dto.setYear(student.getYear());
        dto.setDepartmentName(dept != null ? dept.getDeptName() : "N/A");
        dto.setRole(student.getRole());
        dto.setBidPoints(wallet != null ? wallet.getBalance() : 0);
        return dto;
    }

    private CourseDetailsDto convertToCourseDetailsDto(Course course) {
        Department dept = departmentRepository.findById(course.getDeptId());
        
        CourseDetailsDto dto = new CourseDetailsDto();
        dto.setCourseId(course.getCourseId());
        dto.setCourseCode(course.getCourseCode());
        dto.setCourseName(course.getCourseName());
        dto.setDepartmentName(dept != null ? dept.getDeptName() : "N/A");
        dto.setDepartmentCode(dept != null ? dept.getDeptCode() : "N/A");
        dto.setInstructorName(course.getInstructorName());
        dto.setCredits(course.getCredits());
        dto.setCapacity(course.getCapacity());
        dto.setEnrolled(course.getEnrolled());
        dto.setAvailableSeats(course.getCapacity() - course.getEnrolled());
        dto.setMinBid(course.getMinBid());
        dto.setDescription(course.getDescription());
        dto.setPrerequisites(course.getPrerequisites());
        
        // Use is_course_full() function
        dto.setIsFull(courseRepository.isCourseFull(course.getCourseId().intValue()));
        
        return dto;
    }

    private BidDetailsDto convertToBidDetailsDto(Bid bid) {
        Student student = studentRepository.findById(bid.getStudentId());
        Course course = courseRepository.findById(bid.getCourseId());
        
        BidDetailsDto dto = new BidDetailsDto();
        dto.setBidId(bid.getBidId());
        dto.setStudentId(bid.getStudentId());
        dto.setStudentName(student != null ? student.getName() : "N/A");
        dto.setCourseId(bid.getCourseId());
        dto.setCourseCode(course != null ? course.getCourseCode() : "N/A");
        dto.setRoundId(bid.getRoundId());
        dto.setBidAmount(bid.getBidAmount());
        dto.setStatus(bid.getStatus());
        dto.setPriority(bid.getPriority());
        dto.setCreatedAt(bid.getCreatedAt() != null ? bid.getCreatedAt().toString() : null);
        return dto;
    }
}
