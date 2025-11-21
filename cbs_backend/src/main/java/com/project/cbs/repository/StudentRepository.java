package com.project.cbs.repository;

import com.project.cbs.model.Student;
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
import java.util.Optional;

@Repository
@RequiredArgsConstructor
@Slf4j
public class StudentRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Student> studentRowMapper = (rs, rowNum) -> {
        Student student = new Student();
        student.setStudentId(rs.getLong("student_id"));
        student.setName(rs.getString("name"));
        student.setEmail(rs.getString("email"));
        student.setPassword(rs.getString("password"));
        student.setRole(rs.getString("role"));
        student.setYear(rs.getInt("year"));
        student.setDeptId(rs.getInt("dept_id"));
        return student;
    };
    
    /**
     * Validate if student has enrolled in at least 9 credits (minimum requirement)
     * Uses the validate_min_credits() MySQL function
     * 
     * @param studentId The student ID to validate
     * @return true if student has >= 9 credits enrolled, false otherwise
     */
    public Boolean validateMinimumCredits(Integer studentId) {
        String sql = "SELECT validate_min_credits(?)";
        try {
            Boolean result = jdbcTemplate.queryForObject(sql, Boolean.class, studentId);
            return result != null ? result : false;
        } catch (Exception e) {
            log.error("Error validating minimum credits for student {}: {}", studentId, e.getMessage());
            return false;
        }
    }

    public List<Student> findAll() {
        String sql = "SELECT * FROM student ORDER BY name";
        return jdbcTemplate.query(sql, studentRowMapper);
    }

    public Student findById(Long studentId) {
        String sql = "SELECT * FROM student WHERE student_id = ?";
        List<Student> students = jdbcTemplate.query(sql, studentRowMapper, studentId);
        return students.isEmpty() ? null : students.get(0);
    }

    public Optional<Student> findByEmail(String email) {
        String sql = "SELECT * FROM student WHERE email = ?";
        List<Student> students = jdbcTemplate.query(sql, studentRowMapper, email);
        return students.isEmpty() ? Optional.empty() : Optional.of(students.get(0));
    }

    public List<Student> findByDepartment(Integer deptId) {
        String sql = "SELECT * FROM student WHERE dept_id = ? ORDER BY name";
        return jdbcTemplate.query(sql, studentRowMapper, deptId);
    }

    public List<Student> findByYear(Integer year) {
        String sql = "SELECT * FROM student WHERE year = ? ORDER BY name";
        return jdbcTemplate.query(sql, studentRowMapper, year);
    }

    public Long save(Student student) {
        String sql = "INSERT INTO student (name, email, password, role, year, dept_id) " +
                     "VALUES (?, ?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, student.getName());
            ps.setString(2, student.getEmail());
            ps.setString(3, student.getPassword());
            ps.setString(4, student.getRole() != null ? student.getRole() : "student");
            ps.setInt(5, student.getYear());
            ps.setInt(6, student.getDeptId());
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void update(Student student) {
        String sql = "UPDATE student SET name = ?, email = ?, year = ?, dept_id = ? " +
                     "WHERE student_id = ?";
        jdbcTemplate.update(sql,
                student.getName(),
                student.getEmail(),
                student.getYear(),
                student.getDeptId(),
                student.getStudentId());
    }

    public void updatePassword(Long studentId, String newPassword) {
        String sql = "UPDATE student SET password = ? WHERE student_id = ?";
        jdbcTemplate.update(sql, newPassword, studentId);
    }

    public void delete(Long studentId) {
        String sql = "DELETE FROM student WHERE student_id = ?";
        jdbcTemplate.update(sql, studentId);
    }

    public boolean existsByEmail(String email) {
        String sql = "SELECT COUNT(*) FROM student WHERE email = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, email);
        return count != null && count > 0;
    }
}
