package com.project.cbs.service;

import com.project.cbs.dto.CourseDetailsDto;
import com.project.cbs.model.Course;
import java.util.List;

public interface CourseService {
    List<CourseDetailsDto> getAllCourses();
    CourseDetailsDto getCourseById(Long id);
    List<CourseDetailsDto> searchCourses(String keyword);
    List<CourseDetailsDto> getCoursesByDepartment(Integer deptId);
    List<CourseDetailsDto> getEnrolledCourses(String token);
}
