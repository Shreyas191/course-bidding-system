package com.project.cbs.repository;

import com.project.cbs.model.Bid;
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
public class BidRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Bid> bidRowMapper = (rs, rowNum) -> {
        Bid bid = new Bid();
        bid.setBidId(rs.getLong("bid_id"));
        bid.setStudentId(rs.getLong("student_id"));
        bid.setCourseId(rs.getLong("course_id"));
        bid.setRoundId(rs.getInt("round_id"));
        bid.setBidAmount(rs.getInt("bid_amount"));
        bid.setStatus(rs.getString("status"));
        bid.setPriority(rs.getInt("priority"));
        bid.setCreatedAt(rs.getTimestamp("created_at"));
        bid.setUpdatedAt(rs.getTimestamp("updated_at"));
        return bid;
    };

    public List<Bid> findAll() {
        String sql = "SELECT * FROM bid ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, bidRowMapper);
    }

    public Bid findById(Long bidId) {
        String sql = "SELECT * FROM bid WHERE bid_id = ?";
        List<Bid> bids = jdbcTemplate.query(sql, bidRowMapper, bidId);
        return bids.isEmpty() ? null : bids.get(0);
    }

    public List<Bid> findByStudentId(Long studentId) {
        String sql = "SELECT * FROM bid WHERE student_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, bidRowMapper, studentId);
    }

    public List<Bid> findByCourseId(Long courseId) {
        String sql = "SELECT * FROM bid WHERE course_id = ? ORDER BY bid_amount DESC, created_at ASC";
        return jdbcTemplate.query(sql, bidRowMapper, courseId);
    }

    public List<Bid> findByRoundId(Integer roundId) {
        String sql = "SELECT * FROM bid WHERE round_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, bidRowMapper, roundId);
    }

    public List<Bid> findByStudentAndRound(Long studentId, Integer roundId) {
        String sql = "SELECT * FROM bid WHERE student_id = ? AND round_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, bidRowMapper, studentId, roundId);
    }

    public List<Bid> findByCourseAndRound(Long courseId, Integer roundId) {
        String sql = "SELECT * FROM bid WHERE course_id = ? AND round_id = ? ORDER BY bid_amount DESC, created_at ASC";
        return jdbcTemplate.query(sql, bidRowMapper, courseId, roundId);
    }

    public List<Bid> findByStatus(String status) {
        String sql = "SELECT * FROM bid WHERE status = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, bidRowMapper, status);
    }

    public List<Bid> findPendingBidsByRound(Integer roundId) {
        String sql = "SELECT * FROM bid WHERE round_id = ? AND status = 'pending' ORDER BY course_id, bid_amount DESC, created_at ASC";
        return jdbcTemplate.query(sql, bidRowMapper, roundId);
    }

    public Long save(Bid bid) {
        String sql = "INSERT INTO bid (student_id, course_id, round_id, bid_amount, status, priority) " +
                     "VALUES (?, ?, ?, ?, ?, ?) " +
                     "ON DUPLICATE KEY UPDATE bid_amount = VALUES(bid_amount), status = VALUES(status), priority = VALUES(priority)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, bid.getStudentId());
            ps.setLong(2, bid.getCourseId());
            ps.setInt(3, bid.getRoundId());
            ps.setInt(4, bid.getBidAmount());
            ps.setString(5, bid.getStatus() != null ? bid.getStatus() : "pending");
            ps.setInt(6, bid.getPriority() != null ? bid.getPriority() : 0);
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
    }

    public void updateStatus(Long bidId, String status) {
        String sql = "UPDATE bid SET status = ? WHERE bid_id = ?";
        jdbcTemplate.update(sql, status, bidId);
    }

    public void update(Bid bid) {
        String sql = "UPDATE bid SET bid_amount = ?, status = ? WHERE bid_id = ?";
        jdbcTemplate.update(sql, bid.getBidAmount(), bid.getStatus(), bid.getBidId());
    }

    public void updateBidAmount(Long bidId, Integer newAmount) {
        String sql = "UPDATE bid SET bid_amount = ? WHERE bid_id = ?";
        jdbcTemplate.update(sql, newAmount, bidId);
    }

    public void delete(Long bidId) {
        String sql = "DELETE FROM bid WHERE bid_id = ?";
        jdbcTemplate.update(sql, bidId);
    }

    public Integer getTotalBidAmountByStudentAndRound(Long studentId, Integer roundId) {
        String sql = "SELECT COALESCE(SUM(bid_amount), 0) FROM bid WHERE student_id = ? AND round_id = ? AND status = 'pending'";
        return jdbcTemplate.queryForObject(sql, Integer.class, studentId, roundId);
    }

    public boolean existsByStudentCourseRound(Long studentId, Long courseId, Integer roundId) {
        String sql = "SELECT COUNT(*) FROM bid WHERE student_id = ? AND course_id = ? AND round_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, studentId, courseId, roundId);
        return count != null && count > 0;
    }

    public Bid findByStudentAndCourseAndRound(Long studentId, Long courseId, Integer roundId) {
        String sql = "SELECT * FROM bid WHERE student_id = ? AND course_id = ? AND round_id = ?";
        List<Bid> bids = jdbcTemplate.query(sql, bidRowMapper, studentId, courseId, roundId);
        return bids.isEmpty() ? null : bids.get(0);
    }

    public List<Bid> findByStudentIdAndRoundId(Long studentId, Integer roundId) {
        String sql = "SELECT * FROM bid WHERE student_id = ? AND round_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, bidRowMapper, studentId, roundId);
    }

    public List<Bid> findPendingBidsByRoundId(Integer roundId) {
        String sql = "SELECT * FROM bid WHERE round_id = ? AND status = 'pending' ORDER BY course_id, bid_amount DESC, created_at ASC";
        return jdbcTemplate.query(sql, bidRowMapper, roundId);
    }
}
