package com.project.cbs.repository;

import com.project.cbs.model.Wallet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Repository
@RequiredArgsConstructor
@Slf4j
public class WalletRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Wallet> walletRowMapper = (rs, rowNum) -> {
        Wallet wallet = new Wallet();
        wallet.setWalletId(rs.getLong("wallet_id"));
        wallet.setStudentId(rs.getLong("student_id"));
        wallet.setBalance(rs.getInt("balance"));
        wallet.setTotalSpent(rs.getInt("total_spent"));
        wallet.setCreatedAt(rs.getTimestamp("created_at"));
        wallet.setUpdatedAt(rs.getTimestamp("updated_at"));
        return wallet;
    };

    /**
     * Create a new wallet for a student
     */
    public Long save(Wallet wallet) {
        String sql = "INSERT INTO wallet (student_id, balance, total_spent) VALUES (?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, wallet.getStudentId());
            ps.setInt(2, wallet.getBalance() != null ? wallet.getBalance() : 100);
            ps.setInt(3, wallet.getTotalSpent() != null ? wallet.getTotalSpent() : 0);
            return ps;
        }, keyHolder);
        
        Long walletId = keyHolder.getKey().longValue();
        log.info("Wallet created for student {} with ID: {}", wallet.getStudentId(), walletId);
        return walletId;
    }

    /**
     * Find wallet by student ID
     */
    public Wallet findByStudentId(Long studentId) {
        String sql = "SELECT * FROM wallet WHERE student_id = ?";
        List<Wallet> wallets = jdbcTemplate.query(sql, walletRowMapper, studentId);
        return wallets.isEmpty() ? null : wallets.get(0);
    }

    /**
     * Find wallet by wallet ID
     */
    public Wallet findById(Long walletId) {
        String sql = "SELECT * FROM wallet WHERE wallet_id = ?";
        List<Wallet> wallets = jdbcTemplate.query(sql, walletRowMapper, walletId);
        return wallets.isEmpty() ? null : wallets.get(0);
    }

    /**
     * Get all wallets
     */
    public List<Wallet> findAll() {
        String sql = "SELECT * FROM wallet ORDER BY student_id";
        return jdbcTemplate.query(sql, walletRowMapper);
    }

    /**
     * Add points to wallet (refund or admin grant)
     */
    public void addPoints(Long studentId, Integer points) {
        String sql = "UPDATE wallet SET balance = balance + ?, updated_at = NOW() WHERE student_id = ?";
        jdbcTemplate.update(sql, points, studentId);
        log.info("Added {} points to student {} wallet", points, studentId);
    }

    /**
     * Deduct points from wallet
     * Note: sp_place_bid stored procedure handles bid-related deductions
     * This is for other use cases
     */
    public void deductPoints(Long studentId, Integer points) {
        String sql = "UPDATE wallet SET balance = balance - ?, total_spent = total_spent + ?, updated_at = NOW() " +
                     "WHERE student_id = ?";
        jdbcTemplate.update(sql, points, points, studentId);
        log.info("Deducted {} points from student {} wallet", points, studentId);
    }

    /**
     * Update wallet balance directly
     */
    public void updateBalance(Long studentId, Integer newBalance) {
        String sql = "UPDATE wallet SET balance = ?, updated_at = NOW() WHERE student_id = ?";
        jdbcTemplate.update(sql, newBalance, studentId);
        log.info("Updated wallet balance for student {} to {}", studentId, newBalance);
    }

    /**
     * Get balance for a student
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
     * Get total spent by a student
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

    /**
     * Check if wallet exists for a student
     */
    public boolean existsByStudentId(Long studentId) {
        String sql = "SELECT COUNT(*) FROM wallet WHERE student_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, studentId);
        return count != null && count > 0;
    }

    /**
     * Delete wallet by student ID
     */
    public void deleteByStudentId(Long studentId) {
        String sql = "DELETE FROM wallet WHERE student_id = ?";
        jdbcTemplate.update(sql, studentId);
        log.info("Deleted wallet for student {}", studentId);
    }

    /**
     * Reset wallet balance to default (100 points)
     */
    public void resetBalance(Long studentId) {
        String sql = "UPDATE wallet SET balance = 100, total_spent = 0, updated_at = NOW() WHERE student_id = ?";
        jdbcTemplate.update(sql, studentId);
        log.info("Reset wallet balance for student {}", studentId);
    }
}
