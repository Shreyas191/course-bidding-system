package com.project.cbs.controller;

import com.project.cbs.dto.StudentProfileDto;
import com.project.cbs.service.StudentService;
import com.project.cbs.service.StudentServiceImpl;
import com.project.cbs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class StudentController {

    private final StudentServiceImpl studentService;
    private final JwtUtil jwtUtil;
    
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/me")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String email = studentService.extractEmailFromToken(authHeader);
            StudentProfileDto profile = studentService.getStudentProfile(email);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            log.error("Error fetching profile: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Get student profile with credit validation using validate_min_credits() function
     */
    @GetMapping("/profile-with-validation")
    public ResponseEntity<?> getProfileWithValidation(@RequestHeader("Authorization") String authHeader) {
        try {
            String email = studentService.extractEmailFromToken(authHeader);
            StudentProfileDto profile = studentService.getStudentProfile(email);
            
            // Call validate_min_credits() MySQL function
            Boolean meetsMinCredits = studentService.validateMinimumCredits(profile.getStudentId());
            profile.setMeetsMinimumCredits(meetsMinCredits);
            
            // Get total enrolled credits
            String sql = "SELECT COALESCE(SUM(c.credits), 0) FROM enrollment e " +
                         "JOIN course c ON e.course_id = c.course_id WHERE e.student_id = ?";
            Integer totalCredits = jdbcTemplate.queryForObject(sql, Integer.class, profile.getStudentId());
            profile.setTotalCreditsEnrolled(totalCredits);
            
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            log.error("Error fetching profile with validation: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * Validate if student meets minimum credit requirement (9 credits)
     */
    @GetMapping("/validate-credits")
    public ResponseEntity<?> validateMinimumCredits(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            // Call validate_min_credits() MySQL function
            Boolean isValid = studentService.validateMinimumCredits(studentId);
            
            // Get actual enrolled credits for display
            String sql = "SELECT COALESCE(SUM(c.credits), 0) FROM enrollment e " +
                         "JOIN course c ON e.course_id = c.course_id WHERE e.student_id = ?";
            Integer totalCredits = jdbcTemplate.queryForObject(sql, Integer.class, studentId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("studentId", studentId);
            response.put("meetsMinimumCredits", isValid != null ? isValid : false);
            response.put("minimumRequired", 9);
            response.put("currentCredits", totalCredits);
            response.put("status", Boolean.TRUE.equals(isValid) ? "Valid" : "Need more credits");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error validating minimum credits: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
