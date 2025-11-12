package com.project.cbs.repository;

import com.project.cbs.dto.CourseDto;
import com.project.cbs.entity.Course;
import com.project.cbs.entity.Department;
import com.project.cbs.entity.Instructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class CourseJdbcRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;


    private final RowMapper<CourseDto> courseDtoRowMapper = (rs, rowNum) -> {
    CourseDto dto = new CourseDto();
    dto.setCourseName(rs.getString("course_name"));
            dto.setCourseId(rs.getLong("course_id"));
        dto.setCourseName(rs.getString("course_name"));
        dto.setDepartmentName(rs.getString("department_name"));
        dto.setInstructorName(rs.getString("instructor_name"));
        dto.setDay(rs.getString("day"));
        dto.setTime(rs.getString("time"));
        dto.setLocation(rs.getString("location"));
        dto.setCredits(rs.getInt("credits"));
        dto.setMinBid(rs.getObject("min_bid") != null ? rs.getInt("min_bid") : null);
        dto.setAvgBid(rs.getObject("avg_bid") != null ? rs.getInt("avg_bid") : null);
        dto.setCapacity(rs.getInt("capacity"));
        dto.setEnrolled(rs.getInt("enrolled"));
        dto.setSeats(rs.getInt("seats"));
        return dto;
};


    public List<CourseDto> findAll() {
        return jdbcTemplate.query("SELECT * FROM Course", courseDtoRowMapper);
    }

    public List<CourseDto> findAllWithNames() {
   String sql = 
    "SELECT " +
    "  c.course_id, " +
    "  c.name AS course_name, " +
    "  d.name AS department_name, " +
    "  i.name AS instructor_name, " +
    "  cs.day AS day, " +
    "  cs.time AS time, " +
    "  cs.location AS location, " +
    "  c.credits AS credits, " +
    "  MIN(b.coins_spent) AS min_bid, " +
    "  AVG(b.coins_spent) AS avg_bid, " +
    "  c.capacity AS capacity, " +
    "  COALESCE((SELECT COUNT(*) FROM Enrollment e WHERE e.course_id = c.course_id AND e.status = 'enrolled'), 0) AS enrolled, " +
    "  (c.capacity - COALESCE((SELECT COUNT(*) FROM Enrollment e WHERE e.course_id = c.course_id AND e.status = 'enrolled'), 0)) AS seats " +
    "FROM Course c " +
    "JOIN Department d ON c.dept_id = d.dept_id " +
    "JOIN Instructor i ON c.instructor_id = i.instructor_id " +
    "LEFT JOIN Course_Schedule cs ON c.course_id = cs.course_id " +  // Changed to LEFT JOIN
    "LEFT JOIN Bid b ON c.course_id = b.course_id " +
    "GROUP BY c.course_id, c.name, d.name, i.name, cs.day, cs.time, cs.location, c.credits, c.capacity";


        
        return jdbcTemplate.query(sql, courseDtoRowMapper);
    
}


    public Optional<CourseDto> findById(Long id) {
        List<CourseDto> results = jdbcTemplate.query("SELECT * FROM Course WHERE course_id = ?", courseDtoRowMapper, id);
        return results.stream().findFirst();
    }

    public int save(Course course) {
        String sql = "INSERT INTO Course (name, credits, capacity, dept_id, instructor_id) VALUES (?, ?, ?, ?, ?)";
        return jdbcTemplate.update(sql, course.getName(), course.getCredits(), course.getCapacity(),
                course.getDepartment().getDeptId(), course.getInstructor().getInstructorId());
    }

    public int update(Long id, Course course) {
        String sql = "UPDATE Course SET name = ?, credits = ?, capacity = ?, dept_id = ?, instructor_id = ? WHERE course_id = ?";
        return jdbcTemplate.update(sql, course.getName(), course.getCredits(), course.getCapacity(),
                course.getDepartment().getDeptId(), course.getInstructor().getInstructorId(), id);
    }

    public int delete(Long id) {
        return jdbcTemplate.update("DELETE FROM Course WHERE course_id = ?", id);
    }

    public List<CourseDto> search(String nameFilter) {
        return jdbcTemplate.query("SELECT * FROM Course WHERE name LIKE ?",
                courseDtoRowMapper, "%" + nameFilter + "%");
    }

    public Optional<Integer> checkAvailability(Long id) {
        String sql =
            "SELECT (capacity - (SELECT COUNT(*) FROM Enrollment WHERE course_id = ? AND status = 'enrolled')) AS available FROM Course WHERE course_id = ?";
        List<Integer> result = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getInt("available"), id, id);
        return result.isEmpty() ? Optional.empty() : Optional.of(result.get(0));
    }
}
