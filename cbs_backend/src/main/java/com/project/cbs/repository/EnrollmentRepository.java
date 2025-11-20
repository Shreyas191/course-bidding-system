package com.project.cbs.repository;

import com.project.cbs.model.Enrollment;
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
public class EnrollmentRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Enrollment> enrollmentRowMapper = (rs, rowNum) -> {
        Enrollment enrollment = new Enrollment();
        enrollment.setEnrollmentId(rs.getLong("enrollment_id"));
        enrollment.setStudentId(rs.getLong("student_id"));
        enrollment.setCourseId(rs.getLong("course_id"));
        enrollment.setRoundId(rs.getInt("round_id"));
        
        long bidId = rs.getLong("bid_id");
        enrollment.setBidId(rs.wasNull() ? null : bidId);
        
        enrollment.setEnrollmentDate(rs.getTimestamp("enrollment_date"));
        enrollment.setGrade(rs.getString("grade"));
        return enrollment;
    };

    public List<Enrollment> findAll() {
        String sql = "SELECT * FROM enrollment ORDER BY enrollment_date DESC";
        return jdbcTemplate.query(sql, enrollmentRowMapper);
    }

    public List<Enrollment> findByStudentId(Long studentId) {
        String sql = "SELECT * FROM enrollment WHERE student_id = ? ORDER BY enrollment_date DESC";
        return jdbcTemplate.query(sql, enrollmentRowMapper, studentId);
    }

    public List<Enrollment> findByCourseId(Long courseId) {
        String sql = "SELECT * FROM enrollment WHERE course_id = ? ORDER BY enrollment_date";
        return jdbcTemplate.query(sql, enrollmentRowMapper, courseId);
    }

    public Long save(Enrollment enrollment) {
        String sql = "INSERT INTO enrollment (student_id, course_id, round_id, bid_id) VALUES (?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, enrollment.getStudentId());
            ps.setLong(2, enrollment.getCourseId());
            ps.setInt(3, enrollment.getRoundId());
            if (enrollment.getBidId() != null) {
                ps.setLong(4, enrollment.getBidId());
            } else {
                ps.setNull(4, java.sql.Types.BIGINT);
            }
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().longValue();
    }

    public boolean exists(Long studentId, Long courseId) {
        String sql = "SELECT COUNT(*) FROM enrollment WHERE student_id = ? AND course_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, studentId, courseId);
        return count != null && count > 0;
    }

    public void delete(Long enrollmentId) {
        String sql = "DELETE FROM enrollment WHERE enrollment_id = ?";
        jdbcTemplate.update(sql, enrollmentId);
    }
}
