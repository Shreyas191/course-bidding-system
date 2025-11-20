package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BidResponseDto {
    private Long bidId;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer roundId;
    private String roundName;
    private Integer bidAmount;
    private String status;
    private String createdAt;
}
