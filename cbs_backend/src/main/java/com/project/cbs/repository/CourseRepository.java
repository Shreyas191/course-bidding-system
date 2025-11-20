package com.project.cbs.repository;

import com.project.cbs.model.Course;
import com.project.cbs.model.CourseSchedule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

@Repository
@RequiredArgsConstructor
@Slf4j
public class CourseRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Course> courseRowMapper = (rs, rowNum) -> {
        Course course = new Course();
        course.setCourseId(rs.getLong("course_id"));
        course.setCourseCode(rs.getString("course_code"));
        course.setCourseName(rs.getString("course_name"));
        course.setDeptId(rs.getInt("dept_id"));
        course.setInstructorName(rs.getString("instructor_name"));
        course.setCredits(rs.getInt("credits"));
        course.setCapacity(rs.getInt("capacity"));
        course.setEnrolled(rs.getInt("enrolled"));
        course.setMinBid(rs.getInt("min_bid"));
        course.setDescription(rs.getString("description"));
        course.setPrerequisites(rs.getString("prerequisites"));
        course.setCreatedAt(rs.getTimestamp("created_at"));
        course.setUpdatedAt(rs.getTimestamp("updated_at"));
        return course;
    };

    public List<Course> findAll() {
        String sql = "SELECT * FROM course ORDER BY course_code";
        return jdbcTemplate.query(sql, courseRowMapper);
    }

    public Course findById(Long courseId) {
        String sql = "SELECT * FROM course WHERE course_id = ?";
        return jdbcTemplate.queryForObject(sql, courseRowMapper, courseId);
    }

    public List<Course> findByDepartment(Integer deptId) {
        String sql = "SELECT * FROM course WHERE dept_id = ? ORDER BY course_code";
        return jdbcTemplate.query(sql, courseRowMapper, deptId);
    }

    public Long save(Course course) {
        String sql = "INSERT INTO course (course_code, course_name, dept_id, instructor_name, credits, capacity, enrolled, min_bid, description, prerequisites) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, course.getCourseCode());
            ps.setString(2, course.getCourseName());
            ps.setInt(3, course.getDeptId());
            ps.setString(4, course.getInstructorName());
            ps.setInt(5, course.getCredits());
            ps.setInt(6, course.getCapacity());
            ps.setInt(7, course.getEnrolled() != null ? course.getEnrolled() : 0);
            ps.setInt(8, course.getMinBid() != null ? course.getMinBid() : 10);
            ps.setString(9, course.getDescription());
            ps.setString(10, course.getPrerequisites());
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().longValue();
    }

    public void update(Course course) {
        String sql = "UPDATE course SET course_code = ?, course_name = ?, dept_id = ?, instructor_name = ?, " +
                     "credits = ?, capacity = ?, enrolled = ?, min_bid = ?, description = ?, prerequisites = ? " +
                     "WHERE course_id = ?";
        
        jdbcTemplate.update(sql,
                course.getCourseCode(),
                course.getCourseName(),
                course.getDeptId(),
                course.getInstructorName(),
                course.getCredits(),
                course.getCapacity(),
                course.getEnrolled(),
                course.getMinBid(),
                course.getDescription(),
                course.getPrerequisites(),
                course.getCourseId());
    }

    public void delete(Long courseId) {
        String sql = "DELETE FROM course WHERE course_id = ?";
        jdbcTemplate.update(sql, courseId);
    }

    public List<CourseSchedule> findScheduleByCourseId(Long courseId) {
        String sql = "SELECT * FROM course_schedule WHERE course_id = ? ORDER BY day_of_week, start_time";
        
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            CourseSchedule schedule = new CourseSchedule();
            schedule.setScheduleId(rs.getLong("schedule_id"));
            schedule.setCourseId(rs.getLong("course_id"));
            schedule.setDayOfWeek(rs.getString("day_of_week"));
            schedule.setStartTime(rs.getTime("start_time"));
            schedule.setEndTime(rs.getTime("end_time"));
            schedule.setLocation(rs.getString("location"));
            return schedule;
        }, courseId);
    }

    public void saveSchedule(CourseSchedule schedule) {
        String sql = "INSERT INTO course_schedule (course_id, day_of_week, start_time, end_time, location) " +
                     "VALUES (?, ?, ?, ?, ?)";
        
        jdbcTemplate.update(sql,
                schedule.getCourseId(),
                schedule.getDayOfWeek(),
                schedule.getStartTime(),
                schedule.getEndTime(),
                schedule.getLocation());
    }

    public void updateEnrollmentCount(Long courseId, int change) {
        String sql = "UPDATE course SET enrolled = enrolled + ? WHERE course_id = ?";
        jdbcTemplate.update(sql, change, courseId);
    }

    public List<Course> searchCourses(String keyword) {
        String sql = "SELECT * FROM course WHERE course_code LIKE ? OR course_name LIKE ? OR instructor_name LIKE ?";
        String searchPattern = "%" + keyword + "%";
        return jdbcTemplate.query(sql, courseRowMapper, searchPattern, searchPattern, searchPattern);
    }
}
