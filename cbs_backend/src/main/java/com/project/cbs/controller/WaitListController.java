package com.project.cbs.controller;

import com.project.cbs.dto.WaitlistDto;
import com.project.cbs.model.Course;
import com.project.cbs.model.Waitlist;
import com.project.cbs.repository.CourseRepository;
import com.project.cbs.repository.WaitListRepository;
import com.project.cbs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/waitlist")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class WaitListController {

    private final WaitListRepository waitlistRepository;
    private final CourseRepository courseRepository;
    private final JwtUtil jwtUtil;

    @GetMapping("/my-waitlist")
    public ResponseEntity<?> getMyWaitlist(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            List<Waitlist> waitlist = waitlistRepository.findByStudentId(studentId);
            
            List<WaitlistDto> waitlistDtos = waitlist.stream()
                    .map(w -> {
                        WaitlistDto dto = convertToDto(w);
                        // Add is_course_full() function result
                        dto.setIsCourseFull(courseRepository.isCourseFull(w.getCourseId().intValue()));
                        return dto;
                    })
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(waitlistDtos);
        } catch (Exception e) {
            log.error("Error fetching waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<?> getWaitlistByCourse(@PathVariable Long courseId) {
        try {
            List<Waitlist> waitlist = waitlistRepository.findByCourseId(courseId);
            List<WaitlistDto> waitlistDtos = waitlist.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(waitlistDtos);
        } catch (Exception e) {
            log.error("Error fetching waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeFromWaitlist(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            waitlistRepository.deleteById(id);
            log.info("Student {} removed from waitlist {}", studentId, id);
            return ResponseEntity.ok("Removed from waitlist successfully");
        } catch (Exception e) {
            log.error("Error removing from waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Promote next student from waitlist using promote_from_waitlist stored procedure
     * This is typically called automatically when a student drops a course
     * But can also be triggered manually by admin
     */
    @PostMapping("/promote/{courseId}")
    public ResponseEntity<?> promoteFromWaitlist(@PathVariable Integer courseId) {
        try {
            log.info("Promoting next student from waitlist for course: {}", courseId);
            
            Course course = courseRepository.findById(courseId.longValue());
            if (course == null) {
                return ResponseEntity.badRequest().body("Course not found");
            }
            
            // Check if course is full before promoting
            Boolean isFull = courseRepository.isCourseFull(courseId);
            if (Boolean.TRUE.equals(isFull)) {
                return ResponseEntity.badRequest().body("Course is still full. Cannot promote from waitlist.");
            }
            
            // Call promote_from_waitlist stored procedure
            waitlistRepository.promoteNextStudent(courseId);
            
            log.info("Successfully promoted next student from waitlist for course {}", courseId);
            return ResponseEntity.ok("Next student promoted from waitlist successfully");
        } catch (Exception e) {
            log.error("Error promoting from waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private WaitlistDto convertToDto(Waitlist waitlist) {
        Course course = courseRepository.findById(waitlist.getCourseId());
        WaitlistDto dto = new WaitlistDto();
        dto.setWaitlistId(waitlist.getWaitlistId());
        dto.setCourseId(waitlist.getCourseId());
        dto.setCourseCode(course != null ? course.getCourseCode() : "N/A");
        dto.setCourseName(course != null ? course.getCourseName() : "N/A");
        dto.setPosition(waitlist.getPosition());
        dto.setCreatedAt(waitlist.getCreatedAt() != null ? waitlist.getCreatedAt().toString() : null);
        
        // Add course capacity info
        if (course != null) {
            dto.setCourseCapacity(course.getCapacity());
            dto.setCurrentEnrolled(course.getEnrolled());
        }
        
        return dto;
    }
}
