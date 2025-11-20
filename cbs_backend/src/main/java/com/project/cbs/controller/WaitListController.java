package com.project.cbs.controller;

import com.project.cbs.dto.WaitlistDto;
import com.project.cbs.model.Course;
import com.project.cbs.model.Waitlist;
import com.project.cbs.repository.CourseRepository;
import com.project.cbs.repository.WaitListRepository;
import com.project.cbs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/waitlist")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class WaitListController {

    private final WaitListRepository waitlistRepository;
    private final CourseRepository courseRepository;
    private final JwtUtil jwtUtil;

    @GetMapping("/my-waitlist")
    public ResponseEntity<?> getMyWaitlist(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            List<Waitlist> waitlist = waitlistRepository.findByStudentId(studentId);
            List<WaitlistDto> waitlistDtos = waitlist.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(waitlistDtos);
        } catch (Exception e) {
            log.error("Error fetching waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeFromWaitlist(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.substring(7);
            Long studentId = jwtUtil.extractStudentId(token);
            
            waitlistRepository.deleteById(id);
            log.info("Student {} removed from waitlist {}", studentId, id);
            
            return ResponseEntity.ok().body("Removed from waitlist");
        } catch (Exception e) {
            log.error("Error removing from waitlist: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private WaitlistDto convertToDto(Waitlist waitlist) {
        Course course = courseRepository.findById(waitlist.getCourseId());
        
        WaitlistDto dto = new WaitlistDto();
        dto.setWaitlistId(waitlist.getWaitlistId());
        dto.setCourseId(waitlist.getCourseId());
        dto.setCourseCode(course != null ? course.getCourseCode() : "N/A");
        dto.setCourseName(course != null ? course.getCourseName() : "N/A");
        dto.setPosition(waitlist.getPosition());
        dto.setCreatedAt(waitlist.getCreatedAt() != null ? waitlist.getCreatedAt().toString() : null);
        
        return dto;
    }
}
