package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Enrollment {
    private Long enrollmentId;
    private Long studentId;
    private Long courseId;
    private Integer roundId;
    private Long bidId;
    private Timestamp enrollmentDate;
    private String grade;
}
