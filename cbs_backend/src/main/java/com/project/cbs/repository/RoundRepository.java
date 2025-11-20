package com.project.cbs.repository;

import com.project.cbs.model.Round;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;

@Repository
@RequiredArgsConstructor
@Slf4j
public class RoundRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Round> roundRowMapper = (rs, rowNum) -> {
        Round round = new Round();
        round.setRoundId(rs.getInt("round_id"));
        round.setRoundNumber(rs.getInt("round_number"));
        round.setRoundName(rs.getString("round_name"));
        round.setStartTime(rs.getTimestamp("start_time"));
        round.setEndTime(rs.getTimestamp("end_time"));
        round.setStatus(rs.getString("status"));
        round.setProcessedAt(rs.getTimestamp("processed_at"));
        round.setCreatedAt(rs.getTimestamp("created_at"));
        round.setUpdatedAt(rs.getTimestamp("updated_at"));
        return round;
    };

    public List<Round> findAll() {
        String sql = "SELECT * FROM round ORDER BY round_number";
        return jdbcTemplate.query(sql, roundRowMapper);
    }

    public Round findById(Integer roundId) {
        String sql = "SELECT * FROM round WHERE round_id = ?";
        List<Round> rounds = jdbcTemplate.query(sql, roundRowMapper, roundId);
        return rounds.isEmpty() ? null : rounds.get(0);
    }

    public Round findByRoundNumber(Integer roundNumber) {
        String sql = "SELECT * FROM round WHERE round_number = ?";
        List<Round> rounds = jdbcTemplate.query(sql, roundRowMapper, roundNumber);
        return rounds.isEmpty() ? null : rounds.get(0);
    }

    public Round findActiveRound() {
        String sql = "SELECT * FROM round WHERE status = 'active' LIMIT 1";
        List<Round> rounds = jdbcTemplate.query(sql, roundRowMapper);
        return rounds.isEmpty() ? null : rounds.get(0);
    }

    public List<Round> findByStatus(String status) {
        String sql = "SELECT * FROM round WHERE status = ? ORDER BY round_number";
        return jdbcTemplate.query(sql, roundRowMapper, status);
    }

    public Integer save(Round round) {
        String sql = "INSERT INTO round (round_number, round_name, start_time, end_time, status) " +
                     "VALUES (?, ?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, round.getRoundNumber());
            ps.setString(2, round.getRoundName());
            ps.setTimestamp(3, round.getStartTime());
            ps.setTimestamp(4, round.getEndTime());
            ps.setString(5, round.getStatus() != null ? round.getStatus() : "pending");
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().intValue();
    }

    public void updateStatus(Integer roundId, String status) {
        String sql = "UPDATE round SET status = ? WHERE round_id = ?";
        jdbcTemplate.update(sql, status, roundId);
    }

    public void markAsProcessed(Integer roundId) {
        String sql = "UPDATE round SET status = 'closed', processed_at = ? WHERE round_id = ?";
        jdbcTemplate.update(sql, new Timestamp(System.currentTimeMillis()), roundId);
    }

    public void update(Round round) {
        String sql = "UPDATE round SET round_number = ?, round_name = ?, start_time = ?, end_time = ?, status = ? WHERE round_id = ?";
        jdbcTemplate.update(sql,
                round.getRoundNumber(),
                round.getRoundName(),
                round.getStartTime(),
                round.getEndTime(),
                round.getStatus(),
                round.getRoundId());
    }

    public void delete(Integer roundId) {
        String sql = "DELETE FROM round WHERE round_id = ?";
        jdbcTemplate.update(sql, roundId);
    }
}
