package com.project.cbs.repository;

import com.project.cbs.entity.WaitList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WaitListRepository extends JpaRepository<WaitList, Long> {
    List<WaitList> findByStudentStudentId(Long studentId);
    List<WaitList> findByCourseCourseId(Long courseId);
    List<WaitList> findByCourseCourseIdOrderByPositionAsc(Long courseId);
}