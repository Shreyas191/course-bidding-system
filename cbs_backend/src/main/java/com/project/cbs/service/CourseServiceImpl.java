package com.project.cbs.service;

import com.project.cbs.dto.CourseDetailsDto;
import com.project.cbs.dto.ScheduleDto;
import com.project.cbs.model.Course;
import com.project.cbs.model.CourseSchedule;
import com.project.cbs.model.Department;
import com.project.cbs.model.Enrollment;
import com.project.cbs.repository.CourseRepository;
import com.project.cbs.repository.DepartmentRepository;
import com.project.cbs.repository.EnrollmentRepository;
import com.project.cbs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final DepartmentRepository departmentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final JwtUtil jwtUtil;

    @Override
    public List<CourseDetailsDto> getAllCourses() {
        List<Course> courses = courseRepository.findAll();
        return courses.stream()
                .map(this::convertToDetailsDto)
                .collect(Collectors.toList());
    }

    @Override
    public CourseDetailsDto getCourseById(Long id) {
        Course course = courseRepository.findById(id);
        if (course == null) {
            throw new RuntimeException("Course not found");
        }
        return convertToDetailsDto(course);  // CHANGED: Return DTO instead of Course
    }

    @Override
    public List<CourseDetailsDto> searchCourses(String keyword) {
        List<Course> courses = courseRepository.searchCourses(keyword);
        return courses.stream()
                .map(this::convertToDetailsDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseDetailsDto> getCoursesByDepartment(Integer deptId) {
        List<Course> courses = courseRepository.findByDepartment(deptId);
        return courses.stream()
                .map(this::convertToDetailsDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseDetailsDto> getEnrolledCourses(String token) {
        try {
            // Extract student ID from token
            Long studentId = jwtUtil.extractStudentId(token);
            log.info("Fetching enrolled courses for student ID: {}", studentId);

            // Get all enrollments for this student
            List<Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);

            // Convert to course details
            return enrollments.stream()
                    .map(enrollment -> {
                        Course course = courseRepository.findById(enrollment.getCourseId());
                        return course != null ? convertToDetailsDto(course) : null;
                    })
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching enrolled courses: ", e);
            throw new RuntimeException("Failed to fetch enrolled courses: " + e.getMessage());
        }
    }
    
    /**
     * Check if course is full using is_course_full() MySQL function
     */
    public Boolean isCourseFull(Long courseId) {
        return courseRepository.isCourseFull(courseId.intValue());
    }

    /**
     * Convert Course model to CourseDetailsDto with is_course_full() check
     */
    private CourseDetailsDto convertToDetailsDto(Course course) {
        Department dept = departmentRepository.findById(course.getDeptId());
        List<CourseSchedule> schedules = courseRepository.findScheduleByCourseId(course.getCourseId());

        CourseDetailsDto dto = new CourseDetailsDto();
        dto.setCourseId(course.getCourseId());
        dto.setCourseCode(course.getCourseCode());
        dto.setCourseName(course.getCourseName());
        dto.setDepartmentName(dept != null ? dept.getDeptName() : "N/A");
        dto.setDepartmentCode(dept != null ? dept.getDeptCode() : "N/A");
        dto.setInstructorName(course.getInstructorName());
        dto.setCredits(course.getCredits());
        dto.setCapacity(course.getCapacity());
        dto.setEnrolled(course.getEnrolled());
        dto.setAvailableSeats(course.getCapacity() - course.getEnrolled());
        dto.setMinBid(course.getMinBid());
        dto.setDescription(course.getDescription());
        dto.setPrerequisites(course.getPrerequisites());
        
        // Use is_course_full() MySQL function
        dto.setIsFull(courseRepository.isCourseFull(course.getCourseId().intValue()));

        // Convert schedules
        List<ScheduleDto> scheduleDtos = schedules.stream()
                .map(s -> new ScheduleDto(
                        s.getDayOfWeek(),
                        s.getStartTime() != null ? s.getStartTime().toString() : null,
                        s.getEndTime() != null ? s.getEndTime().toString() : null,
                        s.getLocation()
                ))
                .collect(Collectors.toList());
        dto.setSchedule(scheduleDtos);

        return dto;
    }
}
