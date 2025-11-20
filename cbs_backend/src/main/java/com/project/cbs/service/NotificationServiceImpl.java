package com.project.cbs.service;

import com.project.cbs.dto.NotificationDto;
import com.project.cbs.model.Notification;
import com.project.cbs.repository.NotificationRepository;
import com.project.cbs.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final StudentRepository studentRepository;
    private final WebSocketNotificationService webSocketService;

    @Override
    @Transactional
    public void createNotification(Notification notification) {
        notificationRepository.save(notification);
        log.info("Notification created: {}", notification.getTitle());
    }

    @Override
    @Transactional
    public void sendBidResultNotification(Long studentId, Long bidId, Long courseId, String courseName, boolean won, Integer bidAmount) {
        Notification notification = new Notification();
        notification.setStudentId(studentId);
        notification.setRelatedBidId(bidId);
        notification.setRelatedCourseId(courseId);
        notification.setType("bid_result");
        notification.setIsRead(false);
        
        if (won) {
            notification.setTitle("🎉 Bid Won!");
            notification.setMessage(String.format(
                "Congratulations! You won your bid for %s with %d points. The course has been added to your enrollment.",
                courseName, bidAmount
            ));
        } else {
            notification.setTitle("❌ Bid Not Successful");
            notification.setMessage(String.format(
                "Unfortunately, your bid for %s (%d points) was not successful. Your %d points have been refunded to your wallet.",
                courseName, bidAmount, bidAmount
            ));
        }
        
        notificationRepository.save(notification);
        log.info("Bid result notification sent to student {} for course {}: {}", studentId, courseName, won ? "WON" : "LOST");
        
        // Send real-time notification via WebSocket
        webSocketService.sendToUser(studentId, convertToDto(notification));
    }

    @Override
    @Transactional
    public void broadcastSystemNotification(String title, String message) {
        // Create system-wide notification (studentId = null)
        Notification notification = new Notification();
        notification.setStudentId(null); // System-wide
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType("info");
        notification.setIsRead(false);
        
        notificationRepository.save(notification);
        log.info("System notification broadcast: {}", title);
        
        // Broadcast to all users via WebSocket
        NotificationDto broadcastDto = convertToDto(notification);
        webSocketService.broadcastToAll(broadcastDto);
        
        // Also send to all students individually for their notification feed
        List<Long> studentIds = studentRepository.findAll().stream()
                .map(student -> student.getStudentId())
                .collect(Collectors.toList());
        
        for (Long studentId : studentIds) {
            Notification studentNotification = new Notification();
            studentNotification.setStudentId(studentId);
            studentNotification.setTitle(title);
            studentNotification.setMessage(message);
            studentNotification.setType("info");
            studentNotification.setIsRead(false);
            notificationRepository.save(studentNotification);
            
            // Send individual WebSocket notification
            webSocketService.sendToUser(studentId, convertToDto(studentNotification));
        }
        
        log.info("Broadcast notification sent to {} students", studentIds.size());
    }

    @Override
    @Transactional
    public void sendNotificationToAll(String message, String type) {
        broadcastSystemNotification("System Notification", message);
    }

    @Override
    public List<NotificationDto> getMyNotifications(Long studentId) {
        List<Notification> notifications = notificationRepository.findByStudentId(studentId);
        return notifications.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public Integer getUnreadCount(Long studentId) {
        return notificationRepository.getUnreadCount(studentId);
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.markAsRead(notificationId);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long studentId) {
        notificationRepository.markAllAsRead(studentId);
    }

    private NotificationDto convertToDto(Notification notification) {
        NotificationDto dto = new NotificationDto();
        dto.setNotificationId(notification.getNotificationId());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setType(notification.getType());
        dto.setIsRead(notification.getIsRead());
        dto.setCreatedAt(notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null);
        dto.setRelatedBidId(notification.getRelatedBidId());
        dto.setRelatedCourseId(notification.getRelatedCourseId());
        return dto;
    }
}
