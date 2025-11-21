package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RoundWithBidsDto {
    private Integer roundId;
    private String roundName;
    private String status;
    private String startTime;
    private String endTime;
    private Integer totalBids;
    private Integer totalStudents;
    private Integer totalCourses;
    private List<BidDetailsDto> bids;
}
