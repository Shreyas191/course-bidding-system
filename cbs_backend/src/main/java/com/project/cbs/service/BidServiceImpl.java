package com.project.cbs.service;

import com.project.cbs.dto.BidRequestDto;
import com.project.cbs.dto.BidResponseDto;
import com.project.cbs.model.Bid;
import com.project.cbs.model.Course;
import com.project.cbs.model.Round;
import com.project.cbs.repository.BidRepository;
import com.project.cbs.repository.CourseRepository;
import com.project.cbs.repository.RoundRepository;
import com.project.cbs.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BidServiceImpl implements BidService {

    private final BidRepository bidRepository;
    private final CourseRepository courseRepository;
    private final RoundRepository roundRepository;
    private final WalletRepository walletRepository;
    private final NotificationService notificationService;

    /**
     * Place a bid using sp_place_bid stored procedure
     * The stored procedure handles all validation and transactional logic:
     * - Validates wallet balance
     * - Validates minimum bid amount
     * - Checks for duplicate bids
     * - Deducts from wallet
     * - Creates/updates bid record
     */
    @Override
    @Transactional
    public BidResponseDto placeBid(Long studentId, BidRequestDto request, Integer roundId) {
        log.info("Student {} placing bid for course {} with amount {}", 
                studentId, request.getCourseId(), request.getBidAmount());

        // Validate course exists
        Course course = courseRepository.findById(request.getCourseId());
        if (course == null) {
            throw new RuntimeException("Course not found");
        }

        // Validate round exists and is active
        Round round = roundRepository.findById(roundId);
        if (round == null || !"active".equals(round.getStatus())) {
            throw new RuntimeException("Round is not active");
        }

        // Validate minimum bid
        if (request.getBidAmount() < course.getMinBid()) {
            throw new RuntimeException("Bid amount must be at least " + course.getMinBid() + " points");
        }

        try {
            // Call the stored procedure sp_place_bid
            // This handles all the complex logic atomically in the database
            bidRepository.placeBidUsingStoredProcedure(
                studentId, 
                request.getCourseId(), 
                roundId, 
                request.getBidAmount()
            );
            
            log.info("Bid placed successfully using stored procedure");
            
            // Send notification
            notificationService.sendToUser(
                studentId,
                "Bid Placed Successfully",
                "Your bid of " + request.getBidAmount() + " points for " + 
                course.getCourseCode() + " has been placed.",
                "success"
            );
            
            // Fetch the created/updated bid to return
            Bid bid = bidRepository.findByStudentAndCourseAndRound(
                studentId, request.getCourseId(), roundId
            );
            
            if (bid == null) {
                throw new RuntimeException("Bid was placed but could not be retrieved");
            }
            
            return convertToDto(bid, course, round);
            
        } catch (Exception e) {
            log.error("Error placing bid: {}", e.getMessage());
            throw new RuntimeException(e.getMessage());
        }
    }

    @Override
    public List<BidResponseDto> getMyBids(Long studentId) {
        List<Bid> bids = bidRepository.findByStudentId(studentId);
        return bids.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<BidResponseDto> getMyBidsByRound(Long studentId, Integer roundId) {
        List<Bid> bids = bidRepository.findByStudentIdAndRoundId(studentId, roundId);
        return bids.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void cancelBid(Long bidId, Long studentId) {
        Bid bid = bidRepository.findById(bidId);
        if (bid == null) {
            throw new RuntimeException("Bid not found");
        }

        if (!bid.getStudentId().equals(studentId)) {
            throw new RuntimeException("Not authorized to cancel this bid");
        }

        if (!"pending".equals(bid.getStatus())) {
            throw new RuntimeException("Can only cancel pending bids");
        }

        // Get course info for notification
        Course course = courseRepository.findById(bid.getCourseId());

        // Refund the bid amount before deleting
        walletRepository.addPoints(studentId, bid.getBidAmount());
        bidRepository.delete(bidId);
        
        log.info("Bid {} cancelled by student {}, {} points refunded", 
                bidId, studentId, bid.getBidAmount());
        
        // Send notification
        notificationService.sendToUser(
            studentId,
            "Bid Cancelled",
            "Your bid for " + (course != null ? course.getCourseCode() : "course") + 
            " has been cancelled and " + bid.getBidAmount() + " points have been refunded.",
            "info"
        );
    }

    @Override
    public List<BidResponseDto> getAllBids() {
        List<Bid> bids = bidRepository.findAll();
        return bids.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<BidResponseDto> getBidsByRound(Integer roundId) {
        List<Bid> bids = bidRepository.findByRoundId(roundId);
        return bids.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }
    
    /**
     * Get the latest bid for a student on a course in a specific round
     */
    public BidResponseDto getLatestBid(Long studentId, Long courseId, Integer roundId) {
        Bid bid = bidRepository.findByStudentAndCourseAndRound(studentId, courseId, roundId);
        if (bid == null) {
            throw new RuntimeException("Bid not found");
        }
        return convertToDto(bid);
    }

    // Helper methods for DTO conversion
    private BidResponseDto convertToDto(Bid bid) {
        Course course = courseRepository.findById(bid.getCourseId());
        Round round = roundRepository.findById(bid.getRoundId());
        return convertToDto(bid, course, round);
    }

    private BidResponseDto convertToDto(Bid bid, Course course, Round round) {
        BidResponseDto dto = new BidResponseDto();
        dto.setBidId(bid.getBidId());
        dto.setCourseId(bid.getCourseId());
        dto.setCourseCode(course != null ? course.getCourseCode() : "N/A");
        dto.setCourseName(course != null ? course.getCourseName() : "N/A");
        dto.setRoundId(bid.getRoundId());
        dto.setRoundName(round != null ? round.getRoundName() : "N/A");
        dto.setBidAmount(bid.getBidAmount());
        dto.setStatus(bid.getStatus());
        dto.setCreatedAt(bid.getCreatedAt() != null ? bid.getCreatedAt().toString() : null);
        return dto;
    }
}
