package com.project.cbs.service;

import com.project.cbs.dto.CourseDetailsDto;
import java.util.List;

public interface CourseService {
    List<CourseDetailsDto> getAllCourses();
    CourseDetailsDto getCourseById(Long id);  // CHANGED: Return CourseDetailsDto
    List<CourseDetailsDto> searchCourses(String keyword);
    List<CourseDetailsDto> getCoursesByDepartment(Integer deptId);
    List<CourseDetailsDto> getEnrolledCourses(String token);
}
