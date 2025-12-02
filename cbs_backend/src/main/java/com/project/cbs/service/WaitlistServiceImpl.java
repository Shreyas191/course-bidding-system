package com.project.cbs.service;

import com.project.cbs.dto.WaitlistDto;
import com.project.cbs.model.*;
import com.project.cbs.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaitlistServiceImpl implements WaitlistService {

    private final WaitListRepository waitlistRepository;
    private final BidRepository bidRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final WalletRepository walletRepository;
    private final NotificationService notificationService;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<WaitlistDto> getWaitlistByCourse(Long courseId) {
        List<Waitlist> waitlist = waitlistRepository.findByCourseId(courseId);
        return waitlist.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<WaitlistDto> getMyWaitlist(Long studentId) {
        List<Waitlist> waitlist = waitlistRepository.findByStudentId(studentId);
        return waitlist.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void removeFromWaitlist(Long waitlistId, Long studentId) {
        Waitlist waitlist = waitlistRepository.findAll().stream()
                .filter(w -> w.getWaitlistId().equals(waitlistId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Waitlist entry not found"));
        
        if (!waitlist.getStudentId().equals(studentId)) {
            throw new RuntimeException("Not authorized to remove this waitlist entry");
        }
        
        waitlistRepository.deleteById(waitlistId);
        log.info("Removed student {} from waitlist for course {}", studentId, waitlist.getCourseId());
    }

    @Override
    @Transactional
    public void promoteFromWaitlist(Long courseId) {
        log.info("Manually promoting student from waitlist for course {} (using stored procedure)", courseId);
        
        try {
            // Call the stored procedure to promote from waitlist
            jdbcTemplate.update("CALL promote_from_waitlist(?)", courseId);
            
            log.info("Successfully promoted student from waitlist for course {}", courseId);
            
            // Broadcast notification that waitlist was processed
            Course course = courseRepository.findById(courseId);
            if (course != null) {
                notificationService.broadcastSystemNotification(
                    "Waitlist Update",
                    "A seat has opened up in " + course.getCourseName() + ". " +
                    "Eligible students have been automatically enrolled from the waitlist."
                );
            }
            
        } catch (Exception e) {
            log.error("Error promoting from waitlist for course {}: ", courseId, e);
            throw new RuntimeException("Failed to promote from waitlist: " + e.getMessage());
        }
    }

    /**
     * ✅ NEW METHOD: Promote from waitlist WITH wallet validation
     * 
     * This method implements the application-level logic:
     * 1. Find all students on waitlist for this course
     * 2. Find their losing bids for this course (ordered by bid amount DESC)
     * 3. Try to enroll the student with the highest bid who has sufficient wallet balance
     * 4. If they don't have enough balance, try the next student
     * 5. Continue until someone is enrolled or waitlist is exhausted
     */
    @Override
    @Transactional
    public void promoteFromWaitlistWithValidation(Long courseId) {
        log.info("===== PROMOTING FROM WAITLIST WITH WALLET VALIDATION FOR COURSE {} =====", courseId);
        
        Course course = courseRepository.findById(courseId);
        if (course == null) {
            throw new RuntimeException("Course not found");
        }
        
        // Check if course has available seats
        if (course.getEnrolled() >= course.getCapacity()) {
            log.warn("Course {} is full. Cannot promote from waitlist.", courseId);
            throw new RuntimeException("Course is full");
        }
        
        // Get all students on waitlist for this course
        List<Waitlist> waitlistEntries = waitlistRepository.findByCourseId(courseId);
        
        if (waitlistEntries.isEmpty()) {
            log.info("No students on waitlist for course {}", courseId);
            throw new RuntimeException("No students on waitlist");
        }
        
        log.info("Found {} students on waitlist for course {}", waitlistEntries.size(), courseId);
        
        // For each student on waitlist, find their LOSING bid for this course
        // We need to look at ALL rounds to find their highest losing bid
        List<WaitlistCandidateWithBid> candidates = waitlistEntries.stream()
                .map(waitlistEntry -> {
                    Long studentId = waitlistEntry.getStudentId();
                    
                    // Find all losing bids for this student and course across all rounds
                    List<Bid> losingBids = bidRepository.findByStudentId(studentId).stream()
                            .filter(bid -> bid.getCourseId().equals(courseId))
                            .filter(bid -> "lost".equals(bid.getStatus()))
                            .collect(Collectors.toList());
                    
                    if (losingBids.isEmpty()) {
                        log.warn("Student {} on waitlist for course {} has no losing bids!", studentId, courseId);
                        return null;
                    }
                    
                    // Get the highest losing bid
                    Bid highestLosingBid = losingBids.stream()
                            .max(Comparator.comparing(Bid::getBidAmount))
                            .orElse(null);
                    
                    if (highestLosingBid == null) {
                        return null;
                    }
                    
                    return new WaitlistCandidateWithBid(
                            studentId,
                            waitlistEntry.getWaitlistId(),
                            highestLosingBid.getBidId(),
                            highestLosingBid.getBidAmount(),
                            highestLosingBid.getRoundId()
                    );
                })
                .filter(candidate -> candidate != null)
                .sorted(Comparator.comparing(WaitlistCandidateWithBid::getBidAmount).reversed())
                .collect(Collectors.toList());
        
        if (candidates.isEmpty()) {
            log.warn("No valid candidates with losing bids found on waitlist for course {}", courseId);
            throw new RuntimeException("No valid candidates on waitlist");
        }
        
        log.info("Found {} valid candidates with bids on waitlist", candidates.size());
        
        // Try to enroll candidates in order of bid amount (highest first)
        boolean enrolled = false;
        WaitlistCandidateWithBid enrolledCandidate = null;
        
        for (WaitlistCandidateWithBid candidate : candidates) {
            Long studentId = candidate.getStudentId();
            Integer bidAmount = candidate.getBidAmount();
            
            // ✅ CHECK WALLET BALANCE
            Integer currentBalance = walletRepository.getBalance(studentId);
            
            log.info("Checking student {}: bid={}, wallet balance={}", studentId, bidAmount, currentBalance);
            
            if (currentBalance >= bidAmount) {
                // Student has sufficient balance!
                log.info("✅ Student {} has sufficient balance ({} >= {})", studentId, currentBalance, bidAmount);
                
                // Deduct points from wallet
                walletRepository.deductPoints(studentId, bidAmount);
                log.info("Deducted {} points from student {}", bidAmount, studentId);
                
                // Create enrollment
                Enrollment enrollment = new Enrollment();
                enrollment.setStudentId(studentId);
                enrollment.setCourseId(courseId);
                enrollment.setRoundId(candidate.getRoundId());
                enrollment.setBidId(candidate.getBidId());
                enrollmentRepository.save(enrollment);
                
                // Increment enrolled count
                courseRepository.updateEnrollmentCount(courseId, 1);
                
                // Update bid status to 'won'
                Bid bid = bidRepository.findById(candidate.getBidId());
                if (bid != null) {
                    bid.setStatus("won");
                    bidRepository.update(bid);
                }
                
                // Remove from waitlist
                waitlistRepository.deleteById(candidate.getWaitlistId());
                
                log.info("✅ Successfully enrolled student {} from waitlist for course {}", studentId, courseId);
                
                // Send success notification
                Student student = studentRepository.findById(studentId);
                if (student != null) {
                    notificationService.createNotification(createWaitlistSuccessNotification(
                            studentId,
                            course.getCourseName(),
                            bidAmount
                    ));
                }
                
                enrolled = true;
                enrolledCandidate = candidate;
                break;
                
            } else {
                // Student does NOT have sufficient balance
                log.warn("❌ Student {} does NOT have sufficient balance ({} < {}). Trying next candidate...", 
                         studentId, currentBalance, bidAmount);
                
                // Send notification that they missed the opportunity
                Student student = studentRepository.findById(studentId);
                if (student != null) {
                    notificationService.createNotification(createWaitlistInsufficientFundsNotification(
                            studentId,
                            course.getCourseName(),
                            bidAmount,
                            currentBalance
                    ));
                }
                
                // Continue to next candidate
            }
        }
        
        if (!enrolled) {
            log.error("❌ Could not enroll any student from waitlist - all candidates have insufficient balance");
            throw new RuntimeException("No students on waitlist have sufficient balance to enroll");
        }
        
        // Broadcast system notification
        notificationService.broadcastSystemNotification(
                "Waitlist Update: " + course.getCourseName(),
                "A student has been enrolled from the waitlist for " + course.getCourseName() + "."
        );
        
        log.info("===== WAITLIST PROMOTION COMPLETED FOR COURSE {} =====", courseId);
    }

    @Override
    @Transactional
    public void processAllWaitlists() {
        log.info("Processing all waitlists system-wide WITH WALLET VALIDATION");
        
        try {
            // Get all courses
            List<Course> allCourses = courseRepository.findAll();
            
            int totalProcessed = 0;
            int totalEnrolled = 0;
            
            for (Course course : allCourses) {
                // Check if course has available seats
                if (course.getEnrolled() < course.getCapacity()) {
                    int availableSeats = course.getCapacity() - course.getEnrolled();
                    log.info("Course {} has {} available seats. Checking waitlist...", 
                             course.getCourseId(), availableSeats);
                    
                    // Try to fill available seats from waitlist
                    for (int i = 0; i < availableSeats; i++) {
                        try {
                            promoteFromWaitlistWithValidation(course.getCourseId());
                            totalEnrolled++;
                            totalProcessed++;
                        } catch (Exception e) {
                            log.info("Could not promote more students for course {}: {}", 
                                     course.getCourseId(), e.getMessage());
                            break; // No more valid candidates for this course
                        }
                    }
                }
            }
            
            log.info("Successfully processed all waitlists. Enrolled {} students from {} courses", 
                     totalEnrolled, totalProcessed);
            
            // Broadcast notification
            if (totalEnrolled > 0) {
                notificationService.broadcastSystemNotification(
                        "Waitlist Processing Complete",
                        String.format("All waitlists have been processed. %d students have been automatically enrolled where seats became available.", totalEnrolled)
                );
            }
            
        } catch (Exception e) {
            log.error("Error processing all waitlists: ", e);
            throw new RuntimeException("Failed to process waitlists: " + e.getMessage());
        }
    }

    @Override
    public boolean isOnWaitlist(Long studentId, Long courseId) {
        List<Waitlist> waitlist = waitlistRepository.findByStudentId(studentId);
        return waitlist.stream()
                .anyMatch(w -> w.getCourseId().equals(courseId));
    }

    @Override
    public Integer getWaitlistPosition(Long studentId, Long courseId) {
        List<Waitlist> waitlist = waitlistRepository.findByStudentId(studentId);
        return waitlist.stream()
                .filter(w -> w.getCourseId().equals(courseId))
                .map(Waitlist::getPosition)
                .findFirst()
                .orElse(null);
    }

    private WaitlistDto convertToDto(Waitlist waitlist) {
        Course course = courseRepository.findById(waitlist.getCourseId());
        Student student = studentRepository.findById(waitlist.getStudentId());
        
        WaitlistDto dto = new WaitlistDto();
        dto.setWaitlistId(waitlist.getWaitlistId());
        dto.setCourseId(waitlist.getCourseId());
        dto.setCourseCode(course != null ? course.getCourseCode() : "N/A");
        dto.setCourseName(course != null ? course.getCourseName() : "N/A");
        dto.setPosition(waitlist.getPosition());
        dto.setCreatedAt(waitlist.getCreatedAt() != null ? waitlist.getCreatedAt().toString() : null);
        
        return dto;
    }

    private Notification createWaitlistSuccessNotification(Long studentId, String courseName, Integer bidAmount) {
        Notification notification = new Notification();
        notification.setStudentId(studentId);
        notification.setTitle("🎉 Enrolled from Waitlist!");
        notification.setMessage(String.format(
                "Great news! You have been enrolled in %s from the waitlist. %d points have been deducted from your wallet.",
                courseName, bidAmount
        ));
        notification.setType("success");
        notification.setIsRead(false);
        return notification;
    }

    private Notification createWaitlistInsufficientFundsNotification(Long studentId, String courseName, Integer required, Integer available) {
        Notification notification = new Notification();
        notification.setStudentId(studentId);
        notification.setTitle("❌ Missed Waitlist Opportunity");
        notification.setMessage(String.format(
                "A seat opened in %s, but you couldn't be enrolled because you don't have enough points. Required: %d, Available: %d. The seat has been offered to the next student in line.",
                courseName, required, available
        ));
        notification.setType("warning");
        notification.setIsRead(false);
        return notification;
    }

    /**
     * Helper class to hold waitlist candidate information with their bid
     */
    private static class WaitlistCandidateWithBid {
        private final Long studentId;
        private final Long waitlistId;
        private final Long bidId;
        private final Integer bidAmount;
        private final Integer roundId;

        public WaitlistCandidateWithBid(Long studentId, Long waitlistId, Long bidId, Integer bidAmount, Integer roundId) {
            this.studentId = studentId;
            this.waitlistId = waitlistId;
            this.bidId = bidId;
            this.bidAmount = bidAmount;
            this.roundId = roundId;
        }

        public Long getStudentId() {
            return studentId;
        }

        public Long getWaitlistId() {
            return waitlistId;
        }

        public Long getBidId() {
            return bidId;
        }

        public Integer getBidAmount() {
            return bidAmount;
        }

        public Integer getRoundId() {
            return roundId;
        }
    }
}