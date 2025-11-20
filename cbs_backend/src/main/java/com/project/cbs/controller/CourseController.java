package com.project.cbs.controller;

import com.project.cbs.dto.CourseDetailsDto;
import com.project.cbs.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<?> getAllCourses() {
        try {
            List<CourseDetailsDto> courses = courseService.getAllCourses();
            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            log.error("Error fetching courses: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable Long id) {
        try {
            CourseDetailsDto course = courseService.getCourseById(id);
            return ResponseEntity.ok(course);
        } catch (Exception e) {
            log.error("Error fetching course: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchCourses(@RequestParam String keyword) {
        try {
            List<CourseDetailsDto> courses = courseService.searchCourses(keyword);
            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            log.error("Error searching courses: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/department/{deptId}")
    public ResponseEntity<?> getCoursesByDepartment(@PathVariable Integer deptId) {
        try {
            List<CourseDetailsDto> courses = courseService.getCoursesByDepartment(deptId);
            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            log.error("Error fetching courses by department: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-enrollments")
    public ResponseEntity<?> getMyEnrollments(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract student ID from token (assuming it's stored in the token)
            // For now, we'll get it from the authentication context
            String token = authHeader.replace("Bearer ", "");
            List<CourseDetailsDto> enrolledCourses = courseService.getEnrolledCourses(token);
            return ResponseEntity.ok(enrolledCourses);
        } catch (Exception e) {
            log.error("Error fetching enrolled courses: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
