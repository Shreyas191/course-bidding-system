package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CourseDetailsDto {
    private Long courseId;
    private String courseCode;
    private String courseName;
    private String departmentName;
    private String departmentCode;
    private String instructorName;
    private Integer credits;
    private Integer capacity;
    private Integer enrolled;
    private Integer availableSeats;
    private Integer minBid;
    private String description;
    private String prerequisites;
    
    // NEW: Result from is_course_full() function
    private Boolean isFull;
    
    private List<ScheduleDto> schedule;
}
