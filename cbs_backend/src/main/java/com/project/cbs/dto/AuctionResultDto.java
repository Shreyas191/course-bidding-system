package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuctionResultDto {
    private Integer roundId;
    private String roundName;
    private Integer courseId;
    private String courseCode;
    private String courseName;
    
    // Processing results
    private Integer totalBids;
    private Integer winnersCount;
    private Integer losersCount;
    private Integer waitlistedCount;
    
    // Bid statistics
    private Integer highestBid;
    private Integer lowestWinningBid;
    private Integer averageBid;
    
    private String processedAt;
    private String status;  // "success", "partial", "failed"
}
