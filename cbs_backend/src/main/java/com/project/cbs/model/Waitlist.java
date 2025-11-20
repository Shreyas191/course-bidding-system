package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Waitlist {
    private Long waitlistId;
    private Long studentId;
    private Long courseId;
    private Integer position;
    private Timestamp createdAt;
}
