package com.project.cbs.service;

import com.project.cbs.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send notification to a specific user
     */
    public void sendToUser(Long studentId, NotificationDto notification) {
        try {
            messagingTemplate.convertAndSend("/queue/notifications/" + studentId, notification);
            log.info("WebSocket notification sent to user {}: {}", studentId, notification.getTitle());
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to user {}: {}", studentId, e.getMessage());
        }
    }

    /**
     * Broadcast notification to all connected users
     */
    public void broadcastToAll(NotificationDto notification) {
        try {
            messagingTemplate.convertAndSend("/topic/notifications", notification);
            log.info("WebSocket notification broadcast to all users: {}", notification.getTitle());
        } catch (Exception e) {
            log.error("Failed to broadcast WebSocket notification: {}", e.getMessage());
        }
    }

    /**
     * Send notification to all students (excluding admins if needed)
     */
    public void sendToAllStudents(NotificationDto notification) {
        try {
            messagingTemplate.convertAndSend("/topic/student-notifications", notification);
            log.info("WebSocket notification sent to all students: {}", notification.getTitle());
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to students: {}", e.getMessage());
        }
    }

    /**
     * Send notification to all admins
     */
    public void sendToAllAdmins(NotificationDto notification) {
        try {
            messagingTemplate.convertAndSend("/topic/admin-notifications", notification);
            log.info("WebSocket notification sent to all admins: {}", notification.getTitle());
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to admins: {}", e.getMessage());
        }
    }
}
