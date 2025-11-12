package com.project.cbs.dto;

import lombok.Data;

@Data
public class CourseDto {
    private Long courseId;
    private String courseName;
    private String departmentName;
    private String instructorName;
    private String day;
    private String time;
    private String location;
    private Integer credits;
    private Integer minBid;
    private Integer avgBid;
    private Integer capacity;
    private Integer enrolled;
    private Integer seats;
}