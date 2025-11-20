package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Bid {
    private Long bidId;
    private Long studentId;
    private Long courseId;
    private Integer roundId;
    private Integer bidAmount;
    private String status; // pending, won, lost, cancelled
    private Integer priority;
    private Timestamp createdAt;
    private Timestamp updatedAt;
}
