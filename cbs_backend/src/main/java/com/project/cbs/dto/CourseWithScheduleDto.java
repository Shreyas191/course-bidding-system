package com.project.cbs.dto;

import lombok.Data;

@Data
public class CourseWithScheduleDto {
    private String courseName;
    private String courseCode;
    private Integer deptId;
    private String instructorName;
    private Integer credits;
    private Integer minBid;
    private Integer capacity;
    private String description;
    private String prerequisites;
    
    // Schedule fields
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private String location;
}
