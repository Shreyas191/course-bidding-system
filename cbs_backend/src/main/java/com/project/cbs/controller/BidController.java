package com.project.cbs.controller;

import com.project.cbs.dto.BidRequestDto;
import com.project.cbs.dto.BidResponseDto;
import com.project.cbs.service.BidService;
import com.project.cbs.service.RoundService;
import com.project.cbs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bids")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class BidController {

    private final BidService bidService;
    private final RoundService roundService;
    private final JwtUtil jwtUtil;

    /**
     * Place a bid using sp_place_bid stored procedure
     * The stored procedure handles:
     * - Wallet balance validation
     * - Minimum bid validation
     * - Duplicate bid check
     * - Wallet deduction
     * - Bid creation/update
     */
    @PostMapping
    public ResponseEntity<?> placeBid(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody BidRequestDto request
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);

            // Get current active round
            var currentRound = roundService.getCurrentRound();
            if (currentRound == null) {
                return ResponseEntity.badRequest().body("No active round available");
            }

            log.info("Student {} placing bid for course {} with amount {} in round {}", 
                    studentId, request.getCourseId(), request.getBidAmount(), currentRound.getRoundId());

            // Call service which uses sp_place_bid stored procedure
            BidResponseDto bid = bidService.placeBid(studentId, request, currentRound.getRoundId());
            
            return ResponseEntity.ok(bid);

        } catch (Exception e) {
            log.error("Error placing bid: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-bids")
    public ResponseEntity<?> getMyBids(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            List<BidResponseDto> bids = bidService.getMyBids(studentId);
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            log.error("Error fetching bids: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-bids/round/{roundId}")
    public ResponseEntity<?> getMyBidsByRound(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Integer roundId
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            List<BidResponseDto> bids = bidService.getMyBidsByRound(studentId, roundId);
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            log.error("Error fetching bids: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{bidId}")
    public ResponseEntity<?> cancelBid(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long bidId
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            bidService.cancelBid(bidId, studentId);
            return ResponseEntity.ok("Bid cancelled successfully and points refunded");
        } catch (Exception e) {
            log.error("Error cancelling bid: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
