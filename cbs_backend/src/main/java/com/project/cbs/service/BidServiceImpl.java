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

    @Override
    @Transactional
    public BidResponseDto placeBid(Long studentId, BidRequestDto request, Integer roundId) {
        log.info("Student {} placing bid for course {} with amount {}", studentId, request.getCourseId(), request.getBidAmount());
        
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
        
        // Check if student already has a bid for this course in this round
        Bid existingBid = bidRepository.findByStudentAndCourseAndRound(studentId, request.getCourseId(), roundId);
        
        // Get current wallet balance
        Integer currentBalance = walletRepository.getBalance(studentId);
        
        // Calculate total pending bids for this student in this round (excluding current bid if updating)
        Integer currentTotalBids = bidRepository.getTotalBidAmountByStudentAndRound(studentId, roundId);
        
        Long bidId;
        
        if (existingBid != null) {
            // UPDATING EXISTING BID
            log.info("Updating existing bid {} from {} to {} points", existingBid.getBidId(), existingBid.getBidAmount(), request.getBidAmount());
            
            // Calculate the difference needed
            int bidDifference = request.getBidAmount() - existingBid.getBidAmount();
            
            if (bidDifference > 0) {
                // User wants to INCREASE the bid - need MORE points
                // Check if user has enough balance for the ADDITIONAL amount
                if (currentBalance < bidDifference) {
                    throw new RuntimeException(String.format(
                        "Insufficient balance. You need %d more points (current bid: %d, new bid: %d). Available balance: %d points",
                        bidDifference, existingBid.getBidAmount(), request.getBidAmount(), currentBalance
                    ));
                }
                // Deduct only the additional amount
                walletRepository.deductPoints(studentId, bidDifference);
                log.info("Deducted {} additional points from student {}", bidDifference, studentId);
            } else if (bidDifference < 0) {
                // User wants to DECREASE the bid - REFUND points
                int refundAmount = Math.abs(bidDifference);
                walletRepository.addPoints(studentId, refundAmount);
                log.info("Refunded {} points to student {}", refundAmount, studentId);
            }
            // If bidDifference == 0, no wallet change needed
            
            // Update the bid
            existingBid.setBidAmount(request.getBidAmount());
            bidRepository.update(existingBid);
            bidId = existingBid.getBidId();
            
            log.info("Bid {} updated successfully. New amount: {}, Wallet change: {}", 
                     bidId, request.getBidAmount(), bidDifference);
            
        } else {
            // NEW BID
            log.info("Creating new bid for student {} on course {}", studentId, request.getCourseId());
            
            // For new bids, check if user has enough balance for the full amount
            // Also need to account for other pending bids in this round
            int totalNeeded = currentTotalBids + request.getBidAmount();
            
            if (currentBalance < request.getBidAmount()) {
                throw new RuntimeException(String.format(
                    "Insufficient balance. Required: %d points, Available: %d points",
                    request.getBidAmount(), currentBalance
                ));
            }
            
            // Deduct the full bid amount for new bids
            walletRepository.deductPoints(studentId, request.getBidAmount());
            log.info("Deducted {} points from student {} for new bid", request.getBidAmount(), studentId);
            
            // Create new bid
            Bid bid = new Bid();
            bid.setStudentId(studentId);
            bid.setCourseId(request.getCourseId());
            bid.setRoundId(roundId);
            bid.setBidAmount(request.getBidAmount());
            bid.setStatus("pending");
            
            bidId = bidRepository.save(bid);
            log.info("Created new bid {} for student {}", bidId, studentId);
        }
        
        return convertToDto(bidRepository.findById(bidId), course, round);
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
        
        // Refund the bid amount back to wallet
        walletRepository.addPoints(studentId, bid.getBidAmount());
        log.info("Refunded {} points to student {} for cancelled bid {}", bid.getBidAmount(), studentId, bidId);
        
        bidRepository.delete(bidId);
        log.info("Bid {} cancelled by student {}", bidId, studentId);
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