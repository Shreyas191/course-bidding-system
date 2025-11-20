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
        
        // Calculate total bid amount for this student in this round
        Integer currentTotalBids = bidRepository.getTotalBidAmountByStudentAndRound(studentId, roundId);
        if (existingBid != null) {
            // Subtract existing bid amount since it will be updated
            currentTotalBids -= existingBid.getBidAmount();
        }
        
        // Check wallet balance
        Integer balance = walletRepository.getBalance(studentId);
        if (balance < currentTotalBids + request.getBidAmount()) {
            throw new RuntimeException("Insufficient balance. Available: " + balance + ", Required: " + (currentTotalBids + request.getBidAmount()));
        }
        
        // Create or update bid
        Bid bid = new Bid();
        bid.setStudentId(studentId);
        bid.setCourseId(request.getCourseId());
        bid.setRoundId(roundId);
        bid.setBidAmount(request.getBidAmount());
        bid.setStatus("pending");
        
        Long bidId;
        
        if (existingBid != null) {
            // Update existing bid - refund old amount, deduct new amount
            walletRepository.addPoints(studentId, existingBid.getBidAmount()); // Refund old bid
            walletRepository.deductPoints(studentId, request.getBidAmount()); // Deduct new bid
            bid.setBidId(existingBid.getBidId());
            bidRepository.update(bid);
            bidId = existingBid.getBidId();
            log.info("Updated bid {} for student {}: {} -> {} points", bidId, studentId, existingBid.getBidAmount(), request.getBidAmount());
        } else {
            // New bid - deduct points immediately
            walletRepository.deductPoints(studentId, request.getBidAmount());
            bidId = bidRepository.save(bid);
            log.info("Created new bid {} for student {}: {} points deducted", bidId, studentId, request.getBidAmount());
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
