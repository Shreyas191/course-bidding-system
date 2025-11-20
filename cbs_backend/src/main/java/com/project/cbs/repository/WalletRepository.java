package com.project.cbs.repository;

import com.project.cbs.model.Wallet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

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

    public Wallet findByStudentId(Long studentId) {
        String sql = "SELECT * FROM wallet WHERE student_id = ?";
        List<Wallet> wallets = jdbcTemplate.query(sql, walletRowMapper, studentId);
        return wallets.isEmpty() ? null : wallets.get(0);
    }

    public void updateBalance(Long studentId, int newBalance) {
        String sql = "UPDATE wallet SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?";
        jdbcTemplate.update(sql, newBalance, studentId);
    }

    public void deductPoints(Long studentId, int amount) {
        String sql = "UPDATE wallet SET balance = balance - ?, total_spent = total_spent + ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?";
        jdbcTemplate.update(sql, amount, amount, studentId);
    }

    public void addPoints(Long studentId, int amount) {
        String sql = "UPDATE wallet SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?";
        jdbcTemplate.update(sql, amount, studentId);
    }

    public Integer getBalance(Long studentId) {
        String sql = "SELECT balance FROM wallet WHERE student_id = ?";
        return jdbcTemplate.queryForObject(sql, Integer.class, studentId);
    }
}
