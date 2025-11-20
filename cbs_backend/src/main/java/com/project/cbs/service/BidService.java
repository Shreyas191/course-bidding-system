package com.project.cbs.service;

import com.project.cbs.dto.BidRequestDto;
import com.project.cbs.dto.BidResponseDto;
import java.util.List;

public interface BidService {
    BidResponseDto placeBid(Long studentId, BidRequestDto request, Integer roundId);
    List<BidResponseDto> getMyBids(Long studentId);
    List<BidResponseDto> getMyBidsByRound(Long studentId, Integer roundId);
    void cancelBid(Long bidId, Long studentId);
    List<BidResponseDto> getAllBids();
    List<BidResponseDto> getBidsByRound(Integer roundId);
}
