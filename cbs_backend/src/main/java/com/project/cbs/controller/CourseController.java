package com.project.cbs.controller;

import com.project.cbs.dto.CourseDto;
import com.project.cbs.dto.CourseScheduleDto;
import com.project.cbs.entity.Course;
import com.project.cbs.entity.Student;
import com.project.cbs.repository.CourseJdbcRepository;
import com.project.cbs.repository.StudentJdbcRepository;
import com.project.cbs.util.JwtUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/courses")
@CrossOrigin(origins = "*")
public class CourseController {

    @Autowired
    private CourseJdbcRepository courseRepository;

    @Autowired
    private StudentJdbcRepository studentRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping
    public List<CourseScheduleDto> getAllCourses(@RequestParam(required = false) String name) {
        // if (name != null && !name.isEmpty()) {
        //     return courseRepository.search(name);
        // }
        return courseRepository.findAllCoursesWithDetails();
    }

    // @GetMapping("/{id}")
    // public Optional<CourseDto> getCourseById(@PathVariable Long id) {
    //     return courseRepository.findById(id);
    // }

    @PostMapping
    public String createCourse(@RequestBody Course course) {
        int rows = courseRepository.save(course);
        return rows > 0 ? "Course created successfully" : "Error creating course";
    }

    @PutMapping("/{id}")
    public String updateCourse(@PathVariable Long id, @RequestBody Course course) {
        int rows = courseRepository.update(id, course);
        return rows > 0 ? "Course updated successfully" : "Error updating course";
    }

    @DeleteMapping("/{id}")
    public String deleteCourse(@PathVariable Long id) {
        int rows = courseRepository.delete(id);
        return rows > 0 ? "Course deleted successfully" : "Error deleting course";
    }

    // @GetMapping("/search")
    // public List<CourseDto> searchCourses(@RequestParam String name) {
    //     return courseRepository.search(name);
    // }

    @GetMapping("/{id}/availability")
    public String checkCourseAvailability(@PathVariable Long id) {
        Optional<Integer> availability = courseRepository.checkAvailability(id);
        return availability.map(a -> "Available seats: " + a).orElse("Course not found");
    }

    // Get courses for current student's department
    @GetMapping("/my-department")
    public ResponseEntity<List<CourseScheduleDto>> getCoursesForMyDepartment() {
        String email = getCurrentUserEmail();
        Optional<Student> studentOpt = studentRepository.findByEmail(email);
        
        if (studentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Student student = studentOpt.get();
        List<CourseScheduleDto> courses = courseRepository.findCoursesByDepartment(student.getDepartment().getDeptId());
        return ResponseEntity.ok(courses);
    }

    // Get courses the current student is enrolled in
    @GetMapping("/my-enrollments")
    public ResponseEntity<List<CourseScheduleDto>> getMyEnrolledCourses() {
        String email = getCurrentUserEmail();
        Optional<Student> studentOpt = studentRepository.findByEmail(email);
        
        if (studentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Student student = studentOpt.get();
        List<CourseScheduleDto> courses = courseRepository.findEnrolledCoursesByStudent(student.getStudentId());
        return ResponseEntity.ok(courses);
    }

    // Get courses the current student has bid on
    @GetMapping("/my-bids")
    public ResponseEntity<List<CourseScheduleDto>> getMyBiddedCourses() {
        String email = getCurrentUserEmail();
        Optional<Student> studentOpt = studentRepository.findByEmail(email);
        
        if (studentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Student student = studentOpt.get();
        List<CourseScheduleDto> courses = courseRepository.findCoursesWithBidsByStudent(student.getStudentId());
        return ResponseEntity.ok(courses);
    }

    // Get available courses (with seats available)
    @GetMapping("/available")
    public List<CourseScheduleDto> getAvailableCourses() {
        return courseRepository.findAvailableCourses();
    }

    // Helper method to get current user's email from JWT
    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (String) auth.getPrincipal();
    }
}
