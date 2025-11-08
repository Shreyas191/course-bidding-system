package com.project.cbs.repository;


import com.project.cbs.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByStudentStudentId(Long studentId);
    List<Enrollment> findByCourseCourseId(Long courseId);
    List<Enrollment> findByStudentStudentIdAndStatus(Long studentId, String status);
}