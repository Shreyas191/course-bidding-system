package com.project.cbs.dto;

import lombok.Data;
import java.sql.Timestamp;
import java.util.List;

@Data
public class RoundWithBidsDto {
    private Integer roundId;
    private Integer roundNumber;
    private String roundName;
    private Timestamp startTime;
    private Timestamp endTime;
    private String status;
    private Timestamp processedAt;
    private Integer totalBids;
    private List<BidDetailsDto> bids;
}
