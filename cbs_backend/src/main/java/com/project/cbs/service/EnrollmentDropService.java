package com.project.cbs.service;

import com.project.cbs.model.Course;
import com.project.cbs.model.Enrollment;
import com.project.cbs.repository.CourseRepository;
import com.project.cbs.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnrollmentDropService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final WaitlistService waitlistService;
    private final NotificationService notificationService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Drop a course enrollment and automatically process waitlist
     */
    @Transactional
    public void dropCourse(Long enrollmentId, Long studentId) {
        log.info("Student {} dropping enrollment {}", studentId, enrollmentId);
        
        // Get enrollment details before deletion
        Enrollment enrollment = enrollmentRepository.findAll().stream()
                .filter(e -> e.getEnrollmentId().equals(enrollmentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));
        
        // Verify student owns this enrollment
        if (!enrollment.getStudentId().equals(studentId)) {
            throw new RuntimeException("Not authorized to drop this enrollment");
        }
        
        Long courseId = enrollment.getCourseId();
        Course course = courseRepository.findById(courseId);
        
        // Delete enrollment (this will decrement enrolled count via trigger or we do it manually)
        enrollmentRepository.delete(enrollmentId);
        
        // Manually decrement enrolled count
        courseRepository.updateEnrollmentCount(courseId, -1);
        
        log.info("Dropped course {} for student {}", courseId, studentId);
        
        // Automatically promote from waitlist if there are students waiting
        try {
            waitlistService.promoteFromWaitlist(courseId);
            log.info("Automatically promoted student from waitlist for course {}", courseId);
        } catch (Exception e) {
            log.warn("No students to promote from waitlist for course {}: {}", courseId, e.getMessage());
        }
        
        // Send notification to student who dropped
        if (course != null) {
            // Create a simple notification (not using stored notification service to avoid circular deps)
            log.info("Course {} dropped successfully by student {}", course.getCourseName(), studentId);
        }
    }

    /**
     * Admin force-drops a student from a course
     */
    @Transactional
    public void adminDropStudent(Long enrollmentId) {
        log.info("Admin dropping enrollment {}", enrollmentId);
        
        Enrollment enrollment = enrollmentRepository.findAll().stream()
                .filter(e -> e.getEnrollmentId().equals(enrollmentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));
        
        Long courseId = enrollment.getCourseId();
        Long studentId = enrollment.getStudentId();
        Course course = courseRepository.findById(courseId);
        
        // Delete enrollment
        enrollmentRepository.delete(enrollmentId);
        
        // Manually decrement enrolled count
        courseRepository.updateEnrollmentCount(courseId, -1);
        
        log.info("Admin dropped course {} for student {}", courseId, studentId);
        
        // Automatically promote from waitlist
        try {
            waitlistService.promoteFromWaitlist(courseId);
            log.info("Automatically promoted student from waitlist for course {}", courseId);
        } catch (Exception e) {
            log.warn("No students to promote from waitlist for course {}: {}", courseId, e.getMessage());
        }
        
        // Send notification to affected student
        if (course != null) {
            notificationService.createNotification(createDropNotification(studentId, course.getCourseName()));
        }
    }

    /**
     * Check if using a database function to determine if course is full
     */
    public boolean isCourseFull(Long courseId) {
        try {
            Integer result = jdbcTemplate.queryForObject(
                "SELECT is_course_full(?)", 
                Integer.class, 
                courseId
            );
            return result != null && result == 1;
        } catch (Exception e) {
            log.error("Error checking if course is full: ", e);
            // Fallback to manual check
            Course course = courseRepository.findById(courseId);
            return course != null && course.getEnrolled() >= course.getCapacity();
        }
    }

    /**
     * Validate if student meets minimum credit requirements using database function
     */
    public boolean validateMinCredits(Long studentId) {
        try {
            Integer result = jdbcTemplate.queryForObject(
                "SELECT validate_min_credits(?)", 
                Integer.class, 
                studentId
            );
            return result != null && result == 1;
        } catch (Exception e) {
            log.error("Error validating min credits: ", e);
            return false;
        }
    }

    private com.project.cbs.model.Notification createDropNotification(Long studentId, String courseName) {
        com.project.cbs.model.Notification notification = new com.project.cbs.model.Notification();
        notification.setStudentId(studentId);
        notification.setTitle("Course Dropped");
        notification.setMessage("You have been dropped from " + courseName + " by an administrator.");
        notification.setType("warning");
        notification.setIsRead(false);
        return notification;
    }
}