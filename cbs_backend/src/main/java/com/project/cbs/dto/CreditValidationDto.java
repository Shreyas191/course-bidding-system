package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreditValidationDto {
    private Long studentId;
    
    // Result from validate_min_credits() function
    private Boolean meetsMinimumCredits;
    
    private Integer minimumRequired;  // 9 credits
    private Integer currentCredits;
    private Integer creditsNeeded;    // How many more needed if not meeting minimum
    private String status;            // "Valid" or "Need more credits"
}
