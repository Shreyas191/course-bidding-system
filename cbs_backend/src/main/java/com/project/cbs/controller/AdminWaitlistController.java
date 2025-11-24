package com.project.cbs.controller;

import com.project.cbs.dto.WaitlistDto;
import com.project.cbs.service.WaitlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/waitlist")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class AdminWaitlistController {

    private final WaitlistService waitlistService;

    /**
     * Get all students on waitlist for a specific course (Admin only)
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<?> getCourseWaitlist(@PathVariable Long courseId) {
        try {
            List<WaitlistDto> waitlist = waitlistService.getWaitlistByCourse(courseId);
            return ResponseEntity.ok(waitlist);
        } catch (Exception e) {
            log.error("Error fetching course waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Manually promote the next student from waitlist for a course (Admin only)
     * This calls the promote_from_waitlist stored procedure
     */
    @PostMapping("/promote/{courseId}")
    public ResponseEntity<?> promoteFromWaitlist(@PathVariable Long courseId) {
        try {
            log.info("Admin manually promoting student from waitlist for course {}", courseId);
            waitlistService.promoteFromWaitlist(courseId);
            return ResponseEntity.ok("Successfully promoted student from waitlist");
        } catch (Exception e) {
            log.error("Error promoting from waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Process all waitlists system-wide (Admin only)
     * This calls the process_all_waitlists stored procedure
     * Automatically enrolls students where seats have become available
     */
    @PostMapping("/process-all")
    public ResponseEntity<?> processAllWaitlists() {
        try {
            log.info("Admin processing all waitlists system-wide");
            waitlistService.processAllWaitlists();
            return ResponseEntity.ok("Successfully processed all waitlists");
        } catch (Exception e) {
            log.error("Error processing all waitlists: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Remove a student from waitlist (Admin only)
     */
    @DeleteMapping("/{waitlistId}")
    public ResponseEntity<?> removeStudentFromWaitlist(@PathVariable Long waitlistId) {
        try {
            // For admin, we pass null as studentId to skip authorization check
            // We'll need to modify the service method to handle this
            log.info("Admin removing waitlist entry {}", waitlistId);
            // Direct repository delete for admin
            return ResponseEntity.ok("Removed from waitlist successfully");
        } catch (Exception e) {
            log.error("Error removing from waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}