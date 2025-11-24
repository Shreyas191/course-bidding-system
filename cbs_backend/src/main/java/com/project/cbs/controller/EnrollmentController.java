package com.project.cbs.controller;

import com.project.cbs.service.EnrollmentDropService;
import com.project.cbs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/enrollment")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class EnrollmentController {

    private final EnrollmentDropService enrollmentDropService;
    private final JwtUtil jwtUtil;

    /**
     * Student drops their own course enrollment
     * Automatically promotes next student from waitlist
     */
    @DeleteMapping("/{enrollmentId}")
    public ResponseEntity<?> dropCourse(
            @PathVariable Long enrollmentId,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            enrollmentDropService.dropCourse(enrollmentId, studentId);
            
            return ResponseEntity.ok("Course dropped successfully. Next student from waitlist has been enrolled if available.");
        } catch (Exception e) {
            log.error("Error dropping course: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Check if course is full using database function
     */
    @GetMapping("/check-full/{courseId}")
    public ResponseEntity<?> checkCourseFull(@PathVariable Long courseId) {
        try {
            boolean isFull = enrollmentDropService.isCourseFull(courseId);
            return ResponseEntity.ok(java.util.Map.of("isFull", isFull));
        } catch (Exception e) {
            log.error("Error checking if course is full: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Validate if student meets minimum credit requirements
     */
    @GetMapping("/validate-credits")
    public ResponseEntity<?> validateCredits(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            boolean meetsRequirement = enrollmentDropService.validateMinCredits(studentId);
            return ResponseEntity.ok(java.util.Map.of(
                "meetsMinimumCredits", meetsRequirement,
                "message", meetsRequirement ? "Meets minimum credit requirement" : "Does not meet minimum 9 credits requirement"
            ));
        } catch (Exception e) {
            log.error("Error validating credits: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}