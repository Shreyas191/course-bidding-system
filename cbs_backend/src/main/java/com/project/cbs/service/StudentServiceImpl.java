package com.project.cbs.service;

import com.project.cbs.dto.StudentProfileDto;
import com.project.cbs.model.Student;
import com.project.cbs.repository.StudentRepository;
import com.project.cbs.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import java.util.Optional;

@Service
@Slf4j
public class StudentServiceImpl implements StudentService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JwtUtil jwtUtil;

    public String extractEmailFromToken(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.extractEmail(token);
    }

    public StudentProfileDto getStudentProfile(String email) {
        Optional<Student> studentOpt = studentRepository.findByEmail(email);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found");
        }

        Student student = studentOpt.get();
        
        // Get department name
        String deptSql = "SELECT dept_name FROM department WHERE dept_id = ?";
        String departmentName = jdbcTemplate.queryForObject(deptSql, String.class, student.getDeptId());
        
        // Get wallet balance
        String walletSql = "SELECT balance FROM wallet WHERE student_id = ?";
        Integer bidPoints = jdbcTemplate.queryForObject(walletSql, Integer.class, student.getStudentId());
        
        return new StudentProfileDto(
            student.getStudentId(),
            student.getName(),
            student.getEmail(),
            student.getYear(),
            departmentName,
            student.getRole(),
            bidPoints
        );
    }
    
    /**
     * Validate if student meets minimum credit requirement (9 credits)
     * Uses the validate_min_credits() MySQL function
     * 
     * @param studentId The student ID to validate
     * @return true if student has >= 9 credits enrolled, false otherwise
     */
    public Boolean validateMinimumCredits(Long studentId) {
        try {
            return studentRepository.validateMinimumCredits(studentId.intValue());
        } catch (Exception e) {
            log.error("Error validating minimum credits for student {}: {}", studentId, e.getMessage());
            throw new RuntimeException("Error validating minimum credits: " + e.getMessage());
        }
    }
    
    /**
     * Get student profile with credit validation
     * Includes validation status and actual enrolled credits
     */
    public StudentProfileDto getStudentProfileWithValidation(String email) {
        StudentProfileDto profile = getStudentProfile(email);
        
        // Call validate_min_credits() function
        Boolean meetsMinCredits = validateMinimumCredits(profile.getStudentId());
        profile.setMeetsMinimumCredits(meetsMinCredits);
        
        // Get actual enrolled credits
        String sql = "SELECT COALESCE(SUM(c.credits), 0) FROM enrollment e " +
                     "JOIN course c ON e.course_id = c.course_id WHERE e.student_id = ?";
        Integer totalCredits = jdbcTemplate.queryForObject(sql, Integer.class, profile.getStudentId());
        profile.setTotalCreditsEnrolled(totalCredits);
        
        log.info("Student {} has {} credits enrolled. Meets minimum: {}", 
                profile.getStudentId(), totalCredits, meetsMinCredits);
        
        return profile;
    }
    
    /**
     * Get total enrolled credits for a student
     */
    public Integer getTotalEnrolledCredits(Long studentId) {
        String sql = "SELECT COALESCE(SUM(c.credits), 0) FROM enrollment e " +
                     "JOIN course c ON e.course_id = c.course_id WHERE e.student_id = ?";
        return jdbcTemplate.queryForObject(sql, Integer.class, studentId);
    }

    @Override
    public Object getStudentProfile(Long studentId) {
        Student student = studentRepository.findById(studentId);
        if (student == null) {
            throw new RuntimeException("Student not found");
        }
        
        // Get department name
        String deptSql = "SELECT dept_name FROM department WHERE dept_id = ?";
        String departmentName = jdbcTemplate.queryForObject(deptSql, String.class, student.getDeptId());
        
        // Get wallet balance
        String walletSql = "SELECT balance FROM wallet WHERE student_id = ?";
        Integer bidPoints = jdbcTemplate.queryForObject(walletSql, Integer.class, student.getStudentId());
        
        return new StudentProfileDto(
            student.getStudentId(),
            student.getName(),
            student.getEmail(),
            student.getYear(),
            departmentName,
            student.getRole(),
            bidPoints
        );
    }
}
