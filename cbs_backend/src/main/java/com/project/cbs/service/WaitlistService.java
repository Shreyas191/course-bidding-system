package com.project.cbs.service;

import com.project.cbs.dto.WaitlistDto;

import java.util.List;

public interface WaitlistService {
    // Get waitlist for a specific course
    List<WaitlistDto> getWaitlistByCourse(Long courseId);
    
    // Get student's waitlist entries
    List<WaitlistDto> getMyWaitlist(Long studentId);
    
    // Remove student from waitlist
    void removeFromWaitlist(Long waitlistId, Long studentId);
    
    // Promote student from waitlist (manual promotion by admin) - OLD METHOD
    void promoteFromWaitlist(Long courseId);
    
    // ✅ NEW: Promote from waitlist WITH wallet validation
    void promoteFromWaitlistWithValidation(Long courseId);
    
    // Process all waitlists (promote students where seats are available)
    void processAllWaitlists();
    
    // Check if student is on waitlist for a course
    boolean isOnWaitlist(Long studentId, Long courseId);
    
    // Get student's position on waitlist
    Integer getWaitlistPosition(Long studentId, Long courseId);
}