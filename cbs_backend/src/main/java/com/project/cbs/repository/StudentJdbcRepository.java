package com.project.cbs.repository;

import com.project.cbs.entity.Student;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class StudentJdbcRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final RowMapper<Student> studentRowMapper = new RowMapper<Student>() {
        @Override
        public Student mapRow(ResultSet rs, int rowNum) throws SQLException {
            Student s = new Student();
            s.setStudentId(rs.getLong("student_id"));
            s.setName(rs.getString("name"));
            s.setEmail(rs.getString("email"));
            s.setPassword(rs.getString("password"));
            s.setYear(rs.getInt("year"));
            s.setRole(rs.getString("role"));
            // Set department/wallet/bids/enrollments/waitlists if needed by additional queries
            // s.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            // s.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
            return s;
        }
    };

     public Optional<Student> findByEmail(String email) {
        String sql = "SELECT * FROM Student WHERE email = ?";
        List<Student> results = jdbcTemplate.query(sql, studentRowMapper, email);
        return results.stream().findFirst();
    }

    public List<Student> findAll() {
        return jdbcTemplate.query("SELECT * FROM student", studentRowMapper);
    }

    public Optional<Student> findById(Long id) {
        List<Student> results = jdbcTemplate.query(
            "SELECT * FROM student WHERE student_id = ?", studentRowMapper, id);
        return results.stream().findFirst();
    }

    public int save(Student student) {
        String sql = "INSERT INTO student (name, email, year, dept_id) VALUES (?, ?, ?, ?)";
        return jdbcTemplate.update(sql, student.getName(), student.getEmail(), student.getYear(), student.getDepartment().getDeptId());
    }

    public int update(Long id, Student student) {
        String sql = "UPDATE student SET name = ?, email = ?, password = ?, year = ?, dept_id = ?, updated_at = NOW() WHERE student_id = ?";
        return jdbcTemplate.update(sql, student.getName(), student.getEmail(), student.getYear(), student.getDepartment().getDeptId(), id);
    }

    public int delete(Long id) {
        return jdbcTemplate.update("DELETE FROM student WHERE student_id = ?", id);
    }

    public Optional<Student> findProfileById(Long id) {
        List<Student> results = jdbcTemplate.query(
            "SELECT * FROM student WHERE student_id = ?", studentRowMapper, id);
        return results.stream().findFirst(); // Customize to get joined profile info as needed
    }
}
