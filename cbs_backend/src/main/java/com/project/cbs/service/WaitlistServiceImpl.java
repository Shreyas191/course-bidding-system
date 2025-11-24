package com.project.cbs.service;

import com.project.cbs.dto.WaitlistDto;
import com.project.cbs.model.Course;
import com.project.cbs.model.Student;
import com.project.cbs.model.Waitlist;
import com.project.cbs.repository.CourseRepository;
import com.project.cbs.repository.StudentRepository;
import com.project.cbs.repository.WaitListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaitlistServiceImpl implements WaitlistService {

    private final WaitListRepository waitlistRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
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
        log.info("Manually promoting student from waitlist for course {}", courseId);
        
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

    @Override
    @Transactional
    public void processAllWaitlists() {
        log.info("Processing all waitlists system-wide");
        
        try {
            // Call the stored procedure to process all waitlists
            jdbcTemplate.update("CALL process_all_waitlists()");
            
            log.info("Successfully processed all waitlists");
            
            // Broadcast notification
            notificationService.broadcastSystemNotification(
                "Waitlist Processing Complete",
                "All waitlists have been processed. Students have been automatically enrolled where seats became available."
            );
            
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
}