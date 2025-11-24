package com.project.cbs.controller;

import com.project.cbs.dto.WaitlistDto;
import com.project.cbs.service.WaitlistService;
import com.project.cbs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/waitlist")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class WaitListController {

    private final WaitlistService waitlistService;
    private final JwtUtil jwtUtil;

    /**
     * Get student's own waitlist entries
     */
    @GetMapping("/my-waitlist")
    public ResponseEntity<?> getMyWaitlist(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            List<WaitlistDto> waitlist = waitlistService.getMyWaitlist(studentId);
            return ResponseEntity.ok(waitlist);
        } catch (Exception e) {
            log.error("Error fetching waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Remove student from waitlist (student can remove themselves)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeFromWaitlist(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            waitlistService.removeFromWaitlist(id, studentId);
            log.info("Student {} removed from waitlist {}", studentId, id);
            
            return ResponseEntity.ok().body("Removed from waitlist successfully");
        } catch (Exception e) {
            log.error("Error removing from waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Check if student is on waitlist for a course
     */
    @GetMapping("/check/{courseId}")
    public ResponseEntity<?> checkWaitlistStatus(
            @PathVariable Long courseId,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            boolean isOnWaitlist = waitlistService.isOnWaitlist(studentId, courseId);
            Integer position = waitlistService.getWaitlistPosition(studentId, courseId);
            
            return ResponseEntity.ok(Map.of(
                "isOnWaitlist", isOnWaitlist,
                "position", position != null ? position : 0
            ));
        } catch (Exception e) {
            log.error("Error checking waitlist status: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}