package com.project.cbs.service;

import com.project.cbs.dto.NotificationDto;
import com.project.cbs.model.Notification;

import java.util.List;

public interface NotificationService {
    void createNotification(Notification notification);
    void sendBidResultNotification(Long studentId, Long bidId, Long courseId, String courseName, boolean won, Integer bidAmount);
    void broadcastSystemNotification(String title, String message);
    void sendNotificationToAll(String message, String type);
    List<NotificationDto> getMyNotifications(Long studentId);
    Integer getUnreadCount(Long studentId);
    void markAsRead(Long notificationId);
    void markAllAsRead(Long studentId);
}
