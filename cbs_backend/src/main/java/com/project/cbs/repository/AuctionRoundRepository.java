package com.project.cbs.repository;

import com.project.cbs.entity.AuctionRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuctionRoundRepository extends JpaRepository<AuctionRound, Long> {
    Optional<AuctionRound> findByRoundNumber(Integer roundNumber);
    List<AuctionRound> findByStatus(String status);
    Optional<AuctionRound> findTopByOrderByRoundNumberDesc();
}