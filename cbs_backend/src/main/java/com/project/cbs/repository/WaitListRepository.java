package com.project.cbs.repository;

import com.project.cbs.model.Waitlist;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
@Slf4j
public class WaitlistRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Waitlist> waitlistRowMapper = (rs, rowNum) -> {
        Waitlist waitlist = new Waitlist();
        waitlist.setWaitlistId(rs.getLong("waitlist_id"));
        waitlist.setStudentId(rs.getLong("student_id"));
        waitlist.setCourseId(rs.getLong("course_id"));
        waitlist.setPosition(rs.getInt("position"));
        waitlist.setCreatedAt(rs.getTimestamp("created_at"));
        return waitlist;
    };

    public void addToWaitlist(Long studentId, Long courseId, Integer bidAmount) {
        // Get the next position for this course
        String positionSql = "SELECT COALESCE(MAX(position), 0) + 1 FROM waitlist WHERE course_id = ?";
        Integer nextPosition = jdbcTemplate.queryForObject(positionSql, Integer.class, courseId);
        
        String sql = "INSERT INTO waitlist (student_id, course_id, position, created_at) VALUES (?, ?, ?, NOW())";
        jdbcTemplate.update(sql, studentId, courseId, nextPosition);
        log.info("Added student {} to waitlist for course {} at position {}", studentId, courseId, nextPosition);
    }

    public List<Waitlist> findByStudentId(Long studentId) {
        String sql = "SELECT * FROM waitlist WHERE student_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, waitlistRowMapper, studentId);
    }

    public List<Waitlist> findByCourseId(Long courseId) {
        String sql = "SELECT * FROM waitlist WHERE course_id = ? ORDER BY position ASC";
        return jdbcTemplate.query(sql, waitlistRowMapper, courseId);
    }

    public void deleteById(Long waitlistId) {
        String sql = "DELETE FROM waitlist WHERE waitlist_id = ?";
        jdbcTemplate.update(sql, waitlistId);
    }

    public void deleteByStudentAndCourse(Long studentId, Long courseId) {
        String sql = "DELETE FROM waitlist WHERE student_id = ? AND course_id = ?";
        jdbcTemplate.update(sql, studentId, courseId);
    }

    public List<Waitlist> findAll() {
        String sql = "SELECT * FROM waitlist ORDER BY course_id, position";
        return jdbcTemplate.query(sql, waitlistRowMapper);
    }
}
