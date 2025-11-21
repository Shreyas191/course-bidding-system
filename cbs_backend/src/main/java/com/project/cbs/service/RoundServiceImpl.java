package com.project.cbs.service;

import com.project.cbs.dto.RoundDto;
import com.project.cbs.model.*;
import com.project.cbs.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoundServiceImpl implements RoundService {

    private final RoundRepository roundRepository;
    private final BidRepository bidRepository;
    private final CourseRepository courseRepository;
    private final AuctionRepository auctionRepository;
    private final NotificationService notificationService;

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
        
        // Send notification to all students
        notificationService.broadcastSystemNotification(
                "Round Started: " + round.getRoundName(),
                "Bidding is now open for " + round.getRoundName() + ". Place your bids before the deadline!"
        );
        
        log.info("Round {} activated successfully", roundId);
    }

    /**
     * Process all courses in a round using process_auction_winners stored procedure
     * The stored procedure handles for each course:
     * - Determining winners based on highest bids
     * - Creating enrollment records
     * - Updating course enrollment count
     * - Deducting winning amounts from wallets
     * - Adding losers to waitlist
     * - Updating bid statuses
     */
    @Override
    @Transactional
    public void processRound(Integer roundId) {
        log.info("===== STARTING BID PROCESSING FOR ROUND {} (Using Stored Procedures) =====", roundId);
        
        Round round = roundRepository.findById(roundId);
        if (round == null) {
            throw new RuntimeException("Round not found");
        }

        if (!"active".equals(round.getStatus())) {
            throw new RuntimeException("Can only process active rounds. Current status: " + round.getStatus());
        }

        // Mark round as processing
        roundRepository.updateStatus(roundId, "processing");
        
        try {
            // Get all unique courses that have pending bids in this round
            List<Bid> allBids = bidRepository.findPendingBidsByRoundId(roundId);
            log.info("Found {} pending bids to process", allBids.size());

            if (allBids.isEmpty()) {
                log.warn("No pending bids found for round {}", roundId);
                roundRepository.markAsProcessed(roundId);
                return;
            }

            Set<Long> coursesWithBids = allBids.stream()
                    .map(Bid::getCourseId)
                    .collect(Collectors.toSet());
            
            log.info("Processing bids for {} courses using stored procedures", coursesWithBids.size());

            int processedCount = 0;
            int errorCount = 0;

            // Process each course using the stored procedure
            for (Long courseId : coursesWithBids) {
                try {
                    Course course = courseRepository.findById(courseId);
                    log.info("Processing course {}/{}: {} ({})", 
                            ++processedCount, coursesWithBids.size(),
                            course != null ? course.getCourseCode() : "N/A", 
                            course != null ? course.getCourseName() : "N/A");
                    
                    // Call the process_auction_winners stored procedure
                    // This handles ALL the complex auction logic atomically
                    auctionRepository.processAuctionWinners(roundId, courseId.intValue());
                    
                    log.info("✓ Successfully processed auction for course {}", courseId);
                    
                } catch (Exception e) {
                    errorCount++;
                    log.error("✗ Error processing course {}: {}", courseId, e.getMessage());
                    // Continue processing other courses even if one fails
                }
            }

            log.info("Auction processing completed. Successful: {}, Errors: {}", 
                    processedCount - errorCount, errorCount);

            // Mark round as processed
            roundRepository.markAsProcessed(roundId);
            log.info("===== BID PROCESSING COMPLETED FOR ROUND {} =====", roundId);

            // Send completion notification to all students
            notificationService.broadcastSystemNotification(
                    "Round Processed: " + round.getRoundName(),
                    round.getRoundName() + " has been processed. Check your bids and enrollments to see the results!"
            );
            
        } catch (Exception e) {
            log.error("Critical error processing round: ", e);
            roundRepository.updateStatus(roundId, "active"); // Rollback to active
            throw new RuntimeException("Failed to process round: " + e.getMessage());
        }
    }

    @Override
    public RoundDto getRoundById(Integer roundId) {
        Round round = roundRepository.findById(roundId);
        return round != null ? convertToDto(round) : null;
    }

    private RoundDto convertToDto(Round round) {
        RoundDto dto = new RoundDto();
        dto.setRoundId(round.getRoundId());
        dto.setRoundNumber(round.getRoundNumber());
        dto.setRoundName(round.getRoundName());
        dto.setStartTime(round.getStartTime() != null ? round.getStartTime().toString() : null);
        dto.setEndTime(round.getEndTime() != null ? round.getEndTime().toString() : null);
        dto.setStatus(round.getStatus());
        dto.setProcessedAt(round.getProcessedAt() != null ? round.getProcessedAt().toString() : null);
        return dto;
    }
}
