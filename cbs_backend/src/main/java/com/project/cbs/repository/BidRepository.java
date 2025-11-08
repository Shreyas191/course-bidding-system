package com.project.cbs.repository;

import com.project.cbs.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByStudentStudentId(Long studentId);
    List<Bid> findByCourseCourseId(Long courseId);
    List<Bid> findByRoundRoundId(Long roundId);
    List<Bid> findByStudentStudentIdAndRoundRoundId(Long studentId, Long roundId);
}