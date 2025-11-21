package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BidDetailsDto {
    private Long bidId;
    private Long studentId;
    private String studentName;
    private Long courseId;
    private String courseCode;
    private Integer roundId;
    private Integer bidAmount;
    private String status;
    private Integer priority;
    private String createdAt;  // Make sure this is String, not Timestamp
}
