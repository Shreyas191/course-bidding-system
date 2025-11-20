package com.project.cbs.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.project.cbs.dto.WalletDto;
import com.project.cbs.model.Student;
import com.project.cbs.repository.StudentRepository;
import com.project.cbs.util.JwtUtil;

@Service
public class WalletService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private JwtUtil jwtUtil;

    public WalletDto getWalletByToken(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String email = jwtUtil.extractEmail(token);

        Optional<Student> studentOpt = studentRepository.findByEmail(email);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found");
        }

        Long studentId = studentOpt.get().getStudentId();

        // Check if wallet exists, if not create one
        String checkSql = "SELECT COUNT(*) FROM wallet WHERE student_id = ?";
        Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, studentId);

        if (count == 0) {
            // Create wallet with default balance
            String insertSql = "INSERT INTO wallet (student_id, balance) VALUES (?, 100)";
            jdbcTemplate.update(insertSql, studentId);
        }

        // Fetch wallet
        String sql = "SELECT wallet_id, balance, student_id FROM wallet WHERE student_id = ?";
        return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> 
            new WalletDto(
                rs.getLong("wallet_id"),
                rs.getInt("balance"),
                rs.getLong("student_id")
            ), studentId);
    }
}
