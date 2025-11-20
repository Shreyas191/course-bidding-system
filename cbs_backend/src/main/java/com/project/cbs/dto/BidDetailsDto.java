package com.project.cbs.dto;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class BidDetailsDto {
    private Long bidId;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer roundId;
    private Integer bidAmount;
    private String status;
    private Integer priority;
    private Timestamp createdAt;
}
