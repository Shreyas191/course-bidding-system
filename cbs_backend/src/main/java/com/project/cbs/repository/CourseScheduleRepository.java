package com.project.cbs.repository;

import com.project.cbs.model.CourseSchedule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Time;
import java.sql.Statement;

@Slf4j
@Repository
public class CourseScheduleRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public Long save(CourseSchedule schedule) {
        String sql = "INSERT INTO course_schedule (course_id, day_of_week, start_time, end_time, location) VALUES (?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, schedule.getCourseId());
            ps.setString(2, schedule.getDayOfWeek());
            ps.setTime(3, schedule.getStartTime());
            ps.setTime(4, schedule.getEndTime());
            ps.setString(5, schedule.getLocation());
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().longValue();
    }

    public void deleteByCourseId(Long courseId) {
        String sql = "DELETE FROM course_schedule WHERE course_id = ?";
        jdbcTemplate.update(sql, courseId);
    }
}
