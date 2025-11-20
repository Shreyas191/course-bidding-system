package com.project.cbs.repository;

import com.project.cbs.model.Student;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class StudentRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final RowMapper<Student> studentRowMapper = new RowMapper<Student>() {
        @Override
        public Student mapRow(ResultSet rs, int rowNum) throws SQLException {
            Student student = new Student();
            student.setStudentId(rs.getLong("student_id"));
            student.setName(rs.getString("name"));
            student.setEmail(rs.getString("email"));
            student.setPassword(rs.getString("password"));
            student.setRole(rs.getString("role"));
            student.setYear(rs.getInt("year"));
            student.setDeptId(rs.getInt("dept_id"));
            return student;
        }
    };

    public Optional<Student> findByEmail(String email) {
        String sql = "SELECT student_id, name, email, password, role, year, dept_id FROM student WHERE email = ?";
        List<Student> results = jdbcTemplate.query(sql, studentRowMapper, email);
        return results.stream().findFirst();
    }

    public List<Student> findAll() {
        String sql = "SELECT student_id, name, email, password, role, year, dept_id FROM student";
        return jdbcTemplate.query(sql, studentRowMapper);
    }

    public int save(Student student) {
        String sql = "INSERT INTO student (name, email, password, role, year, dept_id) VALUES (?, ?, ?, ?, ?, ?)";
        // Set defaults if not provided
        Integer year = student.getYear() != null ? student.getYear() : 1;
        Integer deptId = student.getDeptId() != null ? student.getDeptId() : 1;
        return jdbcTemplate.update(sql, student.getName(), student.getEmail(), 
                student.getPassword(), student.getRole(), year, deptId);
    }

    public int deleteByEmail(String email) {
        String sql = "DELETE FROM student WHERE email = ?";
        return jdbcTemplate.update(sql, email);
    }
    
    public Student findById(Long id) {
        String sql = "SELECT student_id, name, email, password, role, year, dept_id FROM student WHERE student_id = ?";
        List<Student> results = jdbcTemplate.query(sql, studentRowMapper, id);
        return results.isEmpty() ? null : results.get(0);
    }
    
    public int update(Student student) {
        String sql = "UPDATE student SET name = ?, email = ?, password = ?, year = ?, dept_id = ? WHERE student_id = ?";
        Integer year = student.getYear() != null ? student.getYear() : 1;
        Integer deptId = student.getDeptId() != null ? student.getDeptId() : 1;
        return jdbcTemplate.update(sql, student.getName(), student.getEmail(), 
                student.getPassword(), year, deptId, student.getStudentId());
    }
    
    public int deleteById(Long id) {
        String sql = "DELETE FROM student WHERE student_id = ?";
        return jdbcTemplate.update(sql, id);
    }
}
