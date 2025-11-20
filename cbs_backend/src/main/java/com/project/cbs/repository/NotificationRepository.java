package com.project.cbs.repository;

import com.project.cbs.model.Notification;
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
public class NotificationRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Notification> notificationRowMapper = (rs, rowNum) -> {
        Notification notification = new Notification();
        notification.setNotificationId(rs.getLong("notification_id"));
        
        long studentId = rs.getLong("student_id");
        notification.setStudentId(rs.wasNull() ? null : studentId);
        
        notification.setTitle(rs.getString("title"));
        notification.setMessage(rs.getString("message"));
        notification.setType(rs.getString("type"));
        notification.setIsRead(rs.getBoolean("is_read"));
        
        long bidId = rs.getLong("related_bid_id");
        notification.setRelatedBidId(rs.wasNull() ? null : bidId);
        
        long courseId = rs.getLong("related_course_id");
        notification.setRelatedCourseId(rs.wasNull() ? null : courseId);
        
        notification.setCreatedAt(rs.getTimestamp("created_at"));
        return notification;
    };

    public List<Notification> findAll() {
        String sql = "SELECT * FROM notification ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, notificationRowMapper);
    }

    public Notification findById(Long notificationId) {
        String sql = "SELECT * FROM notification WHERE notification_id = ?";
        List<Notification> notifications = jdbcTemplate.query(sql, notificationRowMapper, notificationId);
        return notifications.isEmpty() ? null : notifications.get(0);
    }

    public List<Notification> findByStudentId(Long studentId) {
        String sql = "SELECT * FROM notification WHERE student_id = ? OR student_id IS NULL ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, notificationRowMapper, studentId);
    }

    public List<Notification> findUnreadByStudentId(Long studentId) {
        String sql = "SELECT * FROM notification WHERE (student_id = ? OR student_id IS NULL) AND is_read = FALSE ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, notificationRowMapper, studentId);
    }

    public Long save(Notification notification) {
        String sql = "INSERT INTO notification (student_id, title, message, type, is_read, related_bid_id, related_course_id) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            if (notification.getStudentId() != null) {
                ps.setLong(1, notification.getStudentId());
            } else {
                ps.setNull(1, java.sql.Types.BIGINT);
            }
            ps.setString(2, notification.getTitle());
            ps.setString(3, notification.getMessage());
            ps.setString(4, notification.getType());
            ps.setBoolean(5, notification.getIsRead() != null ? notification.getIsRead() : false);
            
            if (notification.getRelatedBidId() != null) {
                ps.setLong(6, notification.getRelatedBidId());
            } else {
                ps.setNull(6, java.sql.Types.BIGINT);
            }
            
            if (notification.getRelatedCourseId() != null) {
                ps.setLong(7, notification.getRelatedCourseId());
            } else {
                ps.setNull(7, java.sql.Types.BIGINT);
            }
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().longValue();
    }

    public void markAsRead(Long notificationId) {
        String sql = "UPDATE notification SET is_read = TRUE WHERE notification_id = ?";
        jdbcTemplate.update(sql, notificationId);
    }

    public void markAllAsReadForStudent(Long studentId) {
        String sql = "UPDATE notification SET is_read = TRUE WHERE student_id = ?";
        jdbcTemplate.update(sql, studentId);
    }

    public void delete(Long notificationId) {
        String sql = "DELETE FROM notification WHERE notification_id = ?";
        jdbcTemplate.update(sql, notificationId);
    }

    public Integer getUnreadCountForStudent(Long studentId) {
        String sql = "SELECT COUNT(*) FROM notification WHERE (student_id = ? OR student_id IS NULL) AND is_read = FALSE";
        return jdbcTemplate.queryForObject(sql, Integer.class, studentId);
    }

    public Integer getUnreadCount(Long studentId) {
        String sql = "SELECT COUNT(*) FROM notification WHERE (student_id = ? OR student_id IS NULL) AND is_read = FALSE";
        return jdbcTemplate.queryForObject(sql, Integer.class, studentId);
    }

    public void markAllAsRead(Long studentId) {
        String sql = "UPDATE notification SET is_read = TRUE WHERE student_id = ?";
        jdbcTemplate.update(sql, studentId);
    }
}
