package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RoundDto {
    private Integer roundId;
    private Integer roundNumber;
    private String roundName;
    private String startTime;
    private String endTime;
    private String status;
    private String processedAt;
}
