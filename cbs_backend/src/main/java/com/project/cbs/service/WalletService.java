package com.project.cbs.service;

import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.cbs.dto.WalletDto;
import com.project.cbs.model.Student;
import com.project.cbs.repository.StudentRepository;
import com.project.cbs.repository.WalletRepository;
import com.project.cbs.util.JwtUtil;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class WalletService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StudentRepository studentRepository;
    
    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Get wallet by authentication token
     * Includes locked amount (sum of pending bids) and available balance
     */
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
            log.info("Creating new wallet for student {}", studentId);
            // Create wallet with default balance
            String insertSql = "INSERT INTO wallet (student_id, balance, total_spent) VALUES (?, 100, 0)";
            jdbcTemplate.update(insertSql, studentId);
        }

        // Fetch wallet with total spent
        String sql = "SELECT wallet_id, balance, student_id, total_spent FROM wallet WHERE student_id = ?";
        WalletDto wallet = jdbcTemplate.queryForObject(sql, (rs, rowNum) ->
            new WalletDto(
                rs.getLong("wallet_id"),
                rs.getInt("balance"),
                rs.getLong("student_id"),
                rs.getInt("total_spent"),
                0  // will calculate locked amount next
            ), studentId);
        
        // Calculate locked amount (sum of pending bids)
        // Note: sp_place_bid already deducted from balance, but we show this for transparency
        String lockedSql = "SELECT COALESCE(SUM(bid_amount), 0) FROM bid " +
                           "WHERE student_id = ? AND status = 'pending'";
        Integer lockedAmount = jdbcTemplate.queryForObject(lockedSql, Integer.class, studentId);
        wallet.setLockedAmount(lockedAmount);
        
        return wallet;
    }
    
    /**
     * Get wallet balance for a specific student
     */
    public Integer getBalance(Long studentId) {
        String sql = "SELECT balance FROM wallet WHERE student_id = ?";
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, studentId);
        } catch (Exception e) {
            log.error("Error fetching balance for student {}: {}", studentId, e.getMessage());
            return 0;
        }
    }
    
    /**
     * Check if student has sufficient balance for a bid
     * Note: The sp_place_bid stored procedure also handles this check,
     * but this method can be used for pre-validation in the UI
     */
    public Boolean hasSufficientBalance(Long studentId, Integer requiredAmount) {
        Integer currentBalance = getBalance(studentId);
        return currentBalance >= requiredAmount;
    }
    
    /**
     * Add points to wallet (admin function or refund)
     */
    @Transactional
    public void addPoints(Long studentId, Integer points) {
        if (points <= 0) {
            throw new RuntimeException("Points to add must be positive");
        }
        
        walletRepository.addPoints(studentId, points);
        log.info("Added {} points to student {} wallet", points, studentId);
    }
    
    /**
     * Deduct points from wallet
     * Note: Use sp_place_bid stored procedure for bid-related deductions
     * This is for other use cases if needed
     */
    @Transactional
    public void deductPoints(Long studentId, Integer points) {
        if (points <= 0) {
            throw new RuntimeException("Points to deduct must be positive");
        }
        
        Integer currentBalance = getBalance(studentId);
        if (currentBalance < points) {
            throw new RuntimeException("Insufficient balance. Current: " + currentBalance + 
                                     ", Required: " + points);
        }
        
        walletRepository.deductPoints(studentId, points);
        log.info("Deducted {} points from student {} wallet", points, studentId);
    }
    
    /**
     * Get total spent by student (useful for analytics)
     */
    public Integer getTotalSpent(Long studentId) {
        String sql = "SELECT total_spent FROM wallet WHERE student_id = ?";
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, studentId);
        } catch (Exception e) {
            log.error("Error fetching total spent for student {}: {}", studentId, e.getMessage());
            return 0;
        }
    }
}
