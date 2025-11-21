package com.project.cbs.repository;

import com.project.cbs.model.Waitlist;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Repository;
import jakarta.annotation.PostConstruct;
import java.util.List;

@Repository
@RequiredArgsConstructor
@Slf4j
public class WaitListRepository {

    private final JdbcTemplate jdbcTemplate;
    
    private SimpleJdbcCall promoteFromWaitlistProc;
    
    @PostConstruct
    public void init() {
        promoteFromWaitlistProc = new SimpleJdbcCall(jdbcTemplate)
            .withProcedureName("promote_from_waitlist");
    }

    private final RowMapper<Waitlist> waitlistRowMapper = (rs, rowNum) -> {
        Waitlist waitlist = new Waitlist();
        waitlist.setWaitlistId(rs.getLong("waitlist_id"));
        waitlist.setStudentId(rs.getLong("student_id"));
        waitlist.setCourseId(rs.getLong("course_id"));
        waitlist.setPosition(rs.getInt("position"));
        waitlist.setCreatedAt(rs.getTimestamp("created_at"));
        return waitlist;
    };
    
    /**
     * Promote next student from waitlist using promote_from_waitlist stored procedure
     * The stored procedure handles:
     * - Finding the student with position = 1
     * - Creating enrollment record
     * - Updating course enrollment count
     * - Removing student from waitlist
     * - Updating positions of remaining students
     */
    public void promoteNextStudent(Integer courseId) {
        SqlParameterSource params = new MapSqlParameterSource()
            .addValue("p_course_id", courseId);
        
        try {
            promoteFromWaitlistProc.execute(params);
            log.info("Promoted next student from waitlist for course {}", courseId);
        } catch (Exception e) {
            log.error("Error promoting from waitlist for course {}: {}", courseId, e.getMessage());
            throw new RuntimeException("Failed to promote from waitlist: " + e.getMessage());
        }
    }

    public void addToWaitlist(Long studentId, Long courseId, Integer bidAmount) {
        // Get the next position for this course
        String positionSql = "SELECT COALESCE(MAX(position), 0) + 1 FROM waitlist WHERE course_id = ?";
        Integer nextPosition = jdbcTemplate.queryForObject(positionSql, Integer.class, courseId);
        
        String sql = "INSERT INTO waitlist (student_id, course_id, position, created_at) " +
                     "VALUES (?, ?, ?, NOW())";
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

    public Waitlist findNextInWaitlist(Long courseId) {
        String sql = "SELECT * FROM waitlist WHERE course_id = ? AND position = 1";
        List<Waitlist> waitlist = jdbcTemplate.query(sql, waitlistRowMapper, courseId);
        return waitlist.isEmpty() ? null : waitlist.get(0);
    }

    public void deleteById(Long waitlistId) {
        String sql = "DELETE FROM waitlist WHERE waitlist_id = ?";
        jdbcTemplate.update(sql, waitlistId);
    }

    public void deleteByStudentAndCourse(Long studentId, Long courseId) {
        String sql = "DELETE FROM waitlist WHERE student_id = ? AND course_id = ?";
        jdbcTemplate.update(sql, studentId, courseId);
    }

    public void updatePositionsAfterRemoval(Long courseId, Integer removedPosition) {
        String sql = "UPDATE waitlist SET position = position - 1 " +
                     "WHERE course_id = ? AND position > ?";
        jdbcTemplate.update(sql, courseId, removedPosition);
    }

    public List<Waitlist> findAll() {
        String sql = "SELECT * FROM waitlist ORDER BY course_id, position";
        return jdbcTemplate.query(sql, waitlistRowMapper);
    }
    
    public Integer getWaitlistSize(Long courseId) {
        String sql = "SELECT COUNT(*) FROM waitlist WHERE course_id = ?";
        return jdbcTemplate.queryForObject(sql, Integer.class, courseId);
    }
}
