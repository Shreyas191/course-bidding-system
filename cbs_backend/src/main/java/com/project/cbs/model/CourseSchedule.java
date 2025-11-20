package com.project.cbs.model;

import lombok.Data;
import java.sql.Time;

@Data
public class CourseSchedule {
    private Long scheduleId;
    private Long courseId;
    private String dayOfWeek;
    private Time startTime;
    private Time endTime;
    private String location;
}
