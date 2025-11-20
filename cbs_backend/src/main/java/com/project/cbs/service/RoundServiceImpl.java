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
    private final EnrollmentRepository enrollmentRepository;
    private final WalletRepository walletRepository;
    private final NotificationService notificationService;
    private final WaitListRepository waitlistRepository;

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
        log.info("===== STARTING BID PROCESSING FOR ROUND {} =====", roundId);
        
        Round round = roundRepository.findById(roundId);
        if (round == null) {
            throw new RuntimeException("Round not found");
        }
        
        if (!"active".equals(round.getStatus())) {
            throw new RuntimeException("Can only process active rounds");
        }
        
        // Mark round as processing
        roundRepository.updateStatus(roundId, "processing");
        
        try {
            // Get all pending bids for this round
            List<Bid> allBids = bidRepository.findPendingBidsByRoundId(roundId);
            log.info("Found {} pending bids to process", allBids.size());
            
            // Group bids by course
            Map<Long, List<Bid>> bidsByCourse = allBids.stream()
                    .collect(Collectors.groupingBy(Bid::getCourseId));
            
            log.info("Processing bids for {} courses", bidsByCourse.size());
            
            // Process each course
            for (Map.Entry<Long, List<Bid>> entry : bidsByCourse.entrySet()) {
                Long courseId = entry.getKey();
                List<Bid> courseBids = entry.getValue();
                
                processCourseBids(courseId, courseBids, roundId);
            }
            
            // Mark round as processed
            roundRepository.markAsProcessed(roundId);
            
            log.info("===== BID PROCESSING COMPLETED FOR ROUND {} =====", roundId);
            
            // Send completion notification
            notificationService.broadcastSystemNotification(
                "Round Processed: " + round.getRoundName(),
                round.getRoundName() + " has been processed. Check your bids to see the results!"
            );
            
        } catch (Exception e) {
            log.error("Error processing round: ", e);
            roundRepository.updateStatus(roundId, "active"); // Rollback to active
            throw new RuntimeException("Failed to process round: " + e.getMessage());
        }
    }

    private void processCourseBids(Long courseId, List<Bid> courseBids, Integer roundId) {
        Course course = courseRepository.findById(courseId);
        if (course == null) {
            log.error("Course {} not found, skipping", courseId);
            return;
        }
        
        log.info("Processing {} bids for course: {} ({})", courseBids.size(), course.getCourseCode(), course.getCourseName());
        
        // Get CURRENT enrolled count from database (fresh data)
        Course freshCourse = courseRepository.findById(courseId);
        int currentEnrolled = freshCourse.getEnrolled();
        int capacity = freshCourse.getCapacity();
        int availableSeats = capacity - currentEnrolled;
        
        log.info("Current enrolled: {}, Capacity: {}, Available seats: {}", currentEnrolled, capacity, availableSeats);
        
        if (availableSeats <= 0) {
            log.info("No available seats, marking all bids as lost and adding to waitlist");
            for (Bid bid : courseBids) {
                bidRepository.updateStatus(bid.getBidId(), "lost");
                walletRepository.addPoints(bid.getStudentId(), bid.getBidAmount());
                waitlistRepository.addToWaitlist(bid.getStudentId(), bid.getCourseId(), bid.getBidAmount());
                notificationService.sendBidResultNotification(
                    bid.getStudentId(), bid.getBidId(), courseId, 
                    course.getCourseName(), false, bid.getBidAmount()
                );
            }
            return;
        }
        
        // Sort bids: highest amount first, then earliest created (FIFO for ties)
        List<Bid> sortedBids = courseBids.stream()
                .sorted(Comparator
                        .comparing(Bid::getBidAmount).reversed()
                        .thenComparing(Bid::getCreatedAt))
                .collect(Collectors.toList());
        
        // Process winners and losers
        for (int i = 0; i < sortedBids.size(); i++) {
            Bid bid = sortedBids.get(i);
            
            if (i < availableSeats) {
                // WINNER
                processWinningBid(bid, course, roundId);
            } else {
                // LOSER
                processLosingBid(bid, course);
            }
        }
    }

    private void processWinningBid(Bid bid, Course course, Integer roundId) {
        log.info("BID WON - Student: {}, Course: {}, Amount: {}", 
                 bid.getStudentId(), course.getCourseCode(), bid.getBidAmount());
        
        try {
            // Update bid status
            bidRepository.updateStatus(bid.getBidId(), "won");
            
            // Create enrollment
            Enrollment enrollment = new Enrollment();
            enrollment.setStudentId(bid.getStudentId());
            enrollment.setCourseId(bid.getCourseId());
            enrollment.setRoundId(roundId);
            enrollment.setBidId(bid.getBidId());
            enrollmentRepository.save(enrollment);
            
            log.info("Enrollment created successfully for student {} in course {}", 
                     bid.getStudentId(), course.getCourseCode());
            
            // Send success notification
            notificationService.sendBidResultNotification(
                bid.getStudentId(), bid.getBidId(), bid.getCourseId(),
                course.getCourseName(), true, bid.getBidAmount()
            );
            
        } catch (Exception e) {
            log.error("Error processing winning bid {}: ", bid.getBidId(), e);
            throw new RuntimeException("Failed to process winning bid: " + e.getMessage());
        }
    }

    private void processLosingBid(Bid bid, Course course) {
        log.info("BID LOST - Student: {}, Course: {}, Amount: {} (REFUNDING & ADDING TO WAITLIST)", 
                 bid.getStudentId(), course.getCourseCode(), bid.getBidAmount());
        
        // Refund the bid amount to student's wallet
        walletRepository.addPoints(bid.getStudentId(), bid.getBidAmount());
        log.info("Refunded {} points to student {}", bid.getBidAmount(), bid.getStudentId());
        
        // Add student to waitlist for this course
        try {
            waitlistRepository.addToWaitlist(bid.getStudentId(), bid.getCourseId(), bid.getBidAmount());
            log.info("Added student {} to waitlist for course {}", bid.getStudentId(), bid.getCourseId());
        } catch (Exception e) {
            log.error("Failed to add to waitlist: ", e);
        }
        
        // Update bid status
        bidRepository.updateStatus(bid.getBidId(), "lost");
        
        // Send failure notification with refund info
        notificationService.sendBidResultNotification(
            bid.getStudentId(), bid.getBidId(), bid.getCourseId(),
            course.getCourseName(), false, bid.getBidAmount()
        );
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
