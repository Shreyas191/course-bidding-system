package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Notification {
    private Long notificationId;
    private Long studentId; // NULL for system-wide notifications
    private String title;
    private String message;
    private String type; // info, success, warning, error, bid_result
    private Boolean isRead;
    private Long relatedBidId;
    private Long relatedCourseId;
    private Timestamp createdAt;
}
