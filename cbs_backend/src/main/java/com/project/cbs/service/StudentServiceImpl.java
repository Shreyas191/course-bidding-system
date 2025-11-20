package com.project.cbs.service;

import com.project.cbs.dto.StudentProfileDto;
import com.project.cbs.model.Student;
import com.project.cbs.repository.StudentRepository;
import com.project.cbs.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
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
}
