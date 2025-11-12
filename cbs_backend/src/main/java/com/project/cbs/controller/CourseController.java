package com.project.cbs.controller;

import com.project.cbs.dto.CourseDto;
import com.project.cbs.entity.Course;
import com.project.cbs.repository.CourseJdbcRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/courses")
@CrossOrigin(origins = "*")
public class CourseController {

    @Autowired
    private CourseJdbcRepository courseRepository;

    @GetMapping
    public List<CourseDto> getAllCourses(@RequestParam(required = false) String name) {
        if (name != null && !name.isEmpty()) {
            return courseRepository.search(name);
        }
        return courseRepository.findAllWithNames();
    }

    @GetMapping("/{id}")
    public Optional<CourseDto> getCourseById(@PathVariable Long id) {
        return courseRepository.findById(id);
    }

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

    @GetMapping("/search")
    public List<CourseDto> searchCourses(@RequestParam String name) {
        return courseRepository.search(name);
    }

    @GetMapping("/{id}/availability")
    public String checkCourseAvailability(@PathVariable Long id) {
        Optional<Integer> availability = courseRepository.checkAvailability(id);
        return availability.map(a -> "Available seats: " + a).orElse("Course not found");
    }
}
