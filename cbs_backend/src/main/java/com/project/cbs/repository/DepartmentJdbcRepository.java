package com.project.cbs.repository;

import com.project.cbs.entity.Department;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class DepartmentJdbcRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final RowMapper<Department> departmentRowMapper = new RowMapper<Department>() {
        @Override
        public Department mapRow(ResultSet rs, int rowNum) throws SQLException {
            Department d = new Department();
            d.setDeptId(rs.getInt("dept_id"));
            d.setName(rs.getString("name"));
            d.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            d.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
            // Students, instructors, and courses would require additional queries if needed
            return d;
        }
    };

    public List<Department> findAll() {
        return jdbcTemplate.query("SELECT * FROM departments", departmentRowMapper);
    }

    public Optional<Department> findById(Long id) {
        List<Department> results = jdbcTemplate.query(
                "SELECT * FROM departments WHERE dept_id = ?", departmentRowMapper, id);
        return results.stream().findFirst();
    }

    public int save(Department department) {
        String sql = "INSERT INTO departments (name, created_at, updated_at) VALUES (?, NOW(), NOW())";
        return jdbcTemplate.update(sql, department.getName());
    }

    public int update(Long id, Department department) {
        String sql = "UPDATE departments SET name = ?, updated_at = NOW() WHERE dept_id = ?";
        return jdbcTemplate.update(sql, department.getName(), id);
    }

    public int delete(Long id) {
        return jdbcTemplate.update("DELETE FROM departments WHERE dept_id = ?", id);
    }
}
