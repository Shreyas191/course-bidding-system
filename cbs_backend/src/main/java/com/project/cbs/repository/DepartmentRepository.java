package com.project.cbs.repository;

import com.project.cbs.model.Department;
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
public class DepartmentRepository {

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<Department> departmentRowMapper = (rs, rowNum) -> {
        Department department = new Department();
        department.setDeptId(rs.getInt("dept_id"));
        department.setDeptName(rs.getString("dept_name"));
        department.setDeptCode(rs.getString("dept_code"));
        department.setCreatedAt(rs.getTimestamp("created_at"));
        return department;
    };

    public List<Department> findAll() {
        String sql = "SELECT * FROM department ORDER BY dept_name";
        return jdbcTemplate.query(sql, departmentRowMapper);
    }

    public Department findById(Integer deptId) {
        String sql = "SELECT * FROM department WHERE dept_id = ?";
        List<Department> depts = jdbcTemplate.query(sql, departmentRowMapper, deptId);
        return depts.isEmpty() ? null : depts.get(0);
    }

    public Department findByCode(String deptCode) {
        String sql = "SELECT * FROM department WHERE dept_code = ?";
        List<Department> depts = jdbcTemplate.query(sql, departmentRowMapper, deptCode);
        return depts.isEmpty() ? null : depts.get(0);
    }

    public Integer save(Department department) {
        String sql = "INSERT INTO department (dept_name, dept_code) VALUES (?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, department.getDeptName());
            ps.setString(2, department.getDeptCode());
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().intValue();
    }

    public void update(Department department) {
        String sql = "UPDATE department SET dept_name = ?, dept_code = ? WHERE dept_id = ?";
        jdbcTemplate.update(sql,
                department.getDeptName(),
                department.getDeptCode(),
                department.getDeptId());
    }

    public void delete(Integer deptId) {
        String sql = "DELETE FROM department WHERE dept_id = ?";
        jdbcTemplate.update(sql, deptId);
    }
}
