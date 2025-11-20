package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Round {
    private Integer roundId;
    private Integer roundNumber;
    private String roundName;
    private Timestamp startTime;
    private Timestamp endTime;
    private String status; // pending, active, processing, closed
    private Timestamp processedAt;
    private Timestamp createdAt;
    private Timestamp updatedAt;
}
