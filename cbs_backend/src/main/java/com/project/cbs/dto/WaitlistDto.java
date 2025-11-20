package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WaitlistDto {
    private Long waitlistId;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer position;
    private String createdAt;
}
