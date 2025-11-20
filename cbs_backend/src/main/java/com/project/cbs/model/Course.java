package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Course {
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer deptId;
    private String instructorName;
    private Integer credits;
    private Integer capacity;
    private Integer enrolled;
    private Integer minBid;
    private String description;
    private String prerequisites;
    private Timestamp createdAt;
    private Timestamp updatedAt;
}
