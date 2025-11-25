package com.project.cbs.service;

import com.project.cbs.dto.RoundDto;
import com.project.cbs.model.*;
import com.project.cbs.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoundServiceImpl implements RoundService {

    private final RoundRepository roundRepository;
    private final BidRepository bidRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final WalletRepository walletRepository;
    private final NotificationService notificationService;
    private final WaitListRepository waitlistRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<RoundDto> getAllRounds() {
        List<Round> rounds = roundRepository.findAll();
        return rounds.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public RoundDto getCurrentRound() {
        Round round = roundRepository.findActiveRound();
        return round != null ? convertToDto(round) : null;
    }

    @Override
    @Transactional
    public RoundDto createRound(Round round) {
        log.info("Creating new round: {}", round.getRoundName());
        Integer roundId = roundRepository.save(round);
        return convertToDto(roundRepository.findById(roundId));
    }

    @Override
    @Transactional
    public void activateRound(Integer roundId) {
        log.info("Activating round: {}", roundId);
        Round round = roundRepository.findById(roundId);
        if (round == null) {
            throw new RuntimeException("Round not found");
        }
        
        // Deactivate any currently active round
        Round activeRound = roundRepository.findActiveRound();
        if (activeRound != null) {
            roundRepository.updateStatus(activeRound.getRoundId(), "closed");
        }
        
        roundRepository.updateStatus(roundId, "active");
        notificationService.broadcastSystemNotification(
            "Round Started: " + round.getRoundName(),
            "Bidding is now open for " + round.getRoundName() + ". Place your bids before the deadline!"
        );
    }

    @Override
    @Transactional
    public void processRound(Integer roundId) {
        log.info("===== STARTING BID PROCESSING FOR ROUND {} USING STORED PROCEDURE =====", roundId);
        
        Round round = roundRepository.findById(roundId);
        if (round == null) {
            throw new RuntimeException("Round not found");
        }
        
        if (!"closed".equals(round.getStatus())) {
            throw new RuntimeException("Can only process completed rounds");
        }
        
        try {
            // Call the stored procedure to process all bids for ALL courses in the round
            // This procedure handles FCFS tie-breaking automatically
            log.info("Calling stored procedure: process_round_bids({})", roundId);
            jdbcTemplate.update("CALL process_round_bids(?)", roundId);
            log.info("Stored procedure execution completed successfully");
            
            // Refresh round data from database (status should now be 'closed')
            round = roundRepository.findById(roundId);
            
            // Get all processed bids for notification
            List<Bid> allBids = bidRepository.findByRoundId(roundId);
            
            // Send notifications to all students about their bid results
            log.info("Sending notifications for {} bids", allBids.size());
            for (Bid bid : allBids) {
                Course course = courseRepository.findById(bid.getCourseId());
                if (course != null && ("won".equals(bid.getStatus()) || "lost".equals(bid.getStatus()))) {
                    boolean won = "won".equals(bid.getStatus());
                    notificationService.sendBidResultNotification(
                        bid.getStudentId(),
                        bid.getBidId(),
                        bid.getCourseId(),
                        course.getCourseName(),
                        won,
                        bid.getBidAmount()
                    );
                }
            }
            
            log.info("===== BID PROCESSING COMPLETED FOR ROUND {} =====", roundId);
            
            // Send completion notification
            notificationService.broadcastSystemNotification(
                "Round Processed: " + round.getRoundName(),
                round.getRoundName() + " has been processed. Check your bids to see the results!"
            );
            
        } catch (Exception e) {
            log.error("Error processing round using stored procedure: ", e);
            // Rollback will happen automatically due to @Transactional
            throw new RuntimeException("Failed to process round: " + e.getMessage());
        }
    }

    @Override
    public RoundDto getRoundById(Integer roundId) {
        Round round = roundRepository.findById(roundId);
        return round != null ? convertToDto(round) : null;
    }

    private RoundDto convertToDto(Round round) {
    DateTimeFormatter formatter = DateTimeFormatter
        .ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")
        .withZone(ZoneId.of("UTC"));
    
    RoundDto dto = new RoundDto();
    dto.setRoundId(round.getRoundId());
    dto.setRoundNumber(round.getRoundNumber());
    dto.setRoundName(round.getRoundName());
    
    dto.setStartTime(round.getStartTime() != null 
        ? formatter.format(round.getStartTime().toInstant())
        : null);
    dto.setEndTime(round.getEndTime() != null 
        ? formatter.format(round.getEndTime().toInstant())
        : null);
    dto.setProcessedAt(round.getProcessedAt() != null 
        ? formatter.format(round.getProcessedAt().toInstant())
        : null);
    
    dto.setStatus(round.getStatus());
    return dto;

}
}
