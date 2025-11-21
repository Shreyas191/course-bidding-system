package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CourseAvailabilityDto {
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer capacity;
    private Integer enrolled;
    private Integer available;
    
    // Result from is_course_full() function
    private Boolean isFull;
    
    // Waitlist info
    private Integer waitlistSize;
}
