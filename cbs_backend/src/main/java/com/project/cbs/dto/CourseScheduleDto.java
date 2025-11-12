package com.project.cbs.dto;

import lombok.Data;

@Data
public class CourseScheduleDto {
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

    // Constructors
    public CourseScheduleDto() {}

    public CourseScheduleDto(Long courseId, String courseName, String departmentName, 
                            String instructorName, String day, String time, String location,
                            Integer credits, Integer minBid, Integer avgBid, 
                            Integer capacity, Integer enrolled, Integer seats) {
        this.courseId = courseId;
        this.courseName = courseName;
        this.departmentName = departmentName;
        this.instructorName = instructorName;
        this.day = day;
        this.time = time;
        this.location = location;
        this.credits = credits;
        this.minBid = minBid;
        this.avgBid = avgBid;
        this.capacity = capacity;
        this.enrolled = enrolled;
        this.seats = seats;
    }
}
