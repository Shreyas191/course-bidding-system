package com.project.cbs.repository;

import com.project.cbs.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCode(String code);
    List<Course> findByDepartmentDeptId(Long deptId);
    List<Course> findByInstructorInstructorId(Long instructorId);
    boolean existsByCode(String code);
}
