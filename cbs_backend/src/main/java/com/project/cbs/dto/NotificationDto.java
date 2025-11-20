package com.project.cbs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationDto {
    private Long notificationId;
    private String title;
    private String message;
    private String type;
    private Boolean isRead;
    private String createdAt;
    private Long relatedBidId;
    private Long relatedCourseId;
}
