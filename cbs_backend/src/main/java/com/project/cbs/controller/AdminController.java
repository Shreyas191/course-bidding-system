package com.project.cbs.controller;

import java.sql.Time;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.project.cbs.dto.BidResponseDto;
import com.project.cbs.dto.CourseDetailsDto;
import com.project.cbs.dto.CourseWithScheduleDto;
import com.project.cbs.dto.RoundDto;
import com.project.cbs.dto.StudentDetailsDto;
import com.project.cbs.dto.RoundWithBidsDto;
import com.project.cbs.dto.BidDetailsDto;
import com.project.cbs.model.Course;
import com.project.cbs.model.CourseSchedule;
import com.project.cbs.model.Round;
import com.project.cbs.model.Student;
import com.project.cbs.model.Department;
import com.project.cbs.model.Wallet;
import com.project.cbs.model.Bid;
import com.project.cbs.repository.CourseRepository;
import com.project.cbs.repository.CourseScheduleRepository;
import com.project.cbs.repository.StudentRepository;
import com.project.cbs.repository.DepartmentRepository;
import com.project.cbs.repository.WalletRepository;
import com.project.cbs.repository.RoundRepository;
import com.project.cbs.repository.BidRepository;
import com.project.cbs.service.BidService;
import com.project.cbs.service.CourseService;
import com.project.cbs.service.NotificationService;
import com.project.cbs.service.RoundService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:5173")
@Slf4j
public class AdminController {

    @Autowired
    private StudentRepository studentRepository;
    
    @Autowired
    private CourseRepository courseRepository;
    
    @Autowired
    private CourseScheduleRepository courseScheduleRepository;
    
    @Autowired
    private DepartmentRepository departmentRepository;
    
    @Autowired
    private WalletRepository walletRepository;
    
    @Autowired
    private RoundRepository roundRepository;
    
    @Autowired
    private BidRepository bidRepository;
    
    @Autowired
    private CourseService courseService;
    
    @Autowired
    private RoundService roundService;
    
    @Autowired
    private BidService bidService;
    
    @Autowired
    private NotificationService notificationService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // ==================== COURSE MANAGEMENT ====================
    
    @PostMapping("/courses")
    public ResponseEntity<?> addCourse(@RequestBody CourseWithScheduleDto courseDto) {
        try {
            // Create and save course
            Course course = new Course();
            course.setCourseName(courseDto.getCourseName());
            course.setCourseCode(courseDto.getCourseCode());
            course.setDeptId(courseDto.getDeptId());
            course.setInstructorName(courseDto.getInstructorName());
            course.setCredits(courseDto.getCredits());
            course.setMinBid(courseDto.getMinBid());
            course.setCapacity(courseDto.getCapacity());
            course.setDescription(courseDto.getDescription());
            course.setPrerequisites(courseDto.getPrerequisites());
            course.setEnrolled(0); // Initialize enrolled count
            
            Long courseId = courseRepository.save(course);
            log.info("Course saved with ID: {}", courseId);
            
            // Create and save schedule
            CourseSchedule schedule = new CourseSchedule();
            schedule.setCourseId(courseId);
            schedule.setDayOfWeek(courseDto.getDayOfWeek());
            schedule.setStartTime(Time.valueOf(courseDto.getStartTime() + ":00"));
            schedule.setEndTime(Time.valueOf(courseDto.getEndTime() + ":00"));
            schedule.setLocation(courseDto.getLocation());
            
            courseScheduleRepository.save(schedule);
            log.info("Schedule saved for course ID: {}", courseId);
            
            // BROADCAST: Course addition is an announcement
            notificationService.broadcastSystemNotification(
                "New Course Available",
                "Course " + course.getCourseName() + " (" + course.getCourseCode() + ") has been added to the catalog."
            );
            return ResponseEntity.ok("Course added successfully");
        } catch (Exception e) {
            log.error("Error adding course: ", e);
            return ResponseEntity.badRequest().body("Error adding course: " + e.getMessage());
        }
    }
    
    @PutMapping("/courses/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Long id, @RequestBody CourseWithScheduleDto courseDto) {
        try {
            Course existing = courseRepository.findById(id);
            if (existing == null) {
                return ResponseEntity.badRequest().body("Course not found");
            }
            
            existing.setCourseName(courseDto.getCourseName());
            existing.setCourseCode(courseDto.getCourseCode());
            existing.setDeptId(courseDto.getDeptId());
            existing.setInstructorName(courseDto.getInstructorName());
            existing.setCredits(courseDto.getCredits());
            existing.setMinBid(courseDto.getMinBid());
            existing.setCapacity(courseDto.getCapacity());
            existing.setDescription(courseDto.getDescription());
            existing.setPrerequisites(courseDto.getPrerequisites());
            
            courseRepository.update(existing);
            
            // Update schedule - delete old and insert new
            courseScheduleRepository.deleteByCourseId(id);
            
            CourseSchedule schedule = new CourseSchedule();
            schedule.setCourseId(id);
            schedule.setDayOfWeek(courseDto.getDayOfWeek());
            schedule.setStartTime(Time.valueOf(courseDto.getStartTime() + ":00"));
            schedule.setEndTime(Time.valueOf(courseDto.getEndTime() + ":00"));
            schedule.setLocation(courseDto.getLocation());
            
            courseScheduleRepository.save(schedule);
            log.info("Course and schedule updated for ID: {}", id);
            
            // NO BROADCAST: Course updates are administrative, not announcements
            
            return ResponseEntity.ok("Course updated successfully");
        } catch (Exception e) {
            log.error("Error updating course: ", e);
            return ResponseEntity.badRequest().body("Error updating course: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
        try {
            courseRepository.delete(id);
            
            // NO BROADCAST: Course deletion is administrative
            log.info("Course deleted with ID: {}", id);
            
            return ResponseEntity.ok("Course deleted successfully");
        } catch (Exception e) {
            log.error("Error deleting course: ", e);
            return ResponseEntity.badRequest().body("Error deleting course: " + e.getMessage());
        }
    }

    // ==================== STUDENT MANAGEMENT ====================
    
    @GetMapping("/students")
    public ResponseEntity<List<StudentDetailsDto>> getAllStudents() {
        List<Student> students = studentRepository.findAll();
        List<StudentDetailsDto> studentDetails = students.stream()
            .filter(student -> "student".equals(student.getRole())) // Only include students, not admins
            .map(student -> {
            StudentDetailsDto dto = new StudentDetailsDto();
            dto.setStudentId(student.getStudentId());
            dto.setName(student.getName());
            dto.setEmail(student.getEmail());
            dto.setRole(student.getRole());
            dto.setYear(student.getYear());
            dto.setDeptId(student.getDeptId());
            
            // Get department name
            if (student.getDeptId() != null) {
                Department dept = departmentRepository.findById(student.getDeptId());
                if (dept != null) {
                    dto.setDepartmentName(dept.getDeptName());
                    dto.setDepartmentCode(dept.getDeptCode());
                }
            }
            
            // Get wallet balance
            Wallet wallet = walletRepository.findByStudentId(student.getStudentId());
            dto.setBidPoints(wallet != null ? wallet.getBalance() : 0);
            
            return dto;
        }).collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(studentDetails);
    }

    @PostMapping("/students")
    public ResponseEntity<?> addStudent(@RequestBody Student student) {
        try {
            log.info("Adding student: {}", student.getEmail());
            
            // Check if email already exists
            if (studentRepository.findByEmail(student.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body("Error adding student: Email already exists");
            }
            
            student.setPassword(passwordEncoder.encode(student.getPassword()));
            
            if (student.getRole() == null || student.getRole().isEmpty()) {
                student.setRole("student");
            }
            
            int result = studentRepository.save(student);
            log.info("Student saved with result: {}", result);
            
            // NO BROADCAST: Student management is administrative, not an announcement
            
            return ResponseEntity.ok("Student added successfully");
        } catch (Exception e) {
            log.error("Error adding student: ", e);
            return ResponseEntity.badRequest().body("Error adding student: " + e.getMessage());
        }
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<?> deleteStudent(@PathVariable Long id) {
        try {
            studentRepository.deleteById(id);
            
            // NO BROADCAST: Student management is administrative
            log.info("Student deleted with ID: {}", id);
            
            return ResponseEntity.ok("Student deleted successfully");
        } catch (Exception e) {
            log.error("Error deleting student: ", e);
            return ResponseEntity.badRequest().body("Error deleting student: " + e.getMessage());
        }
    }
    
    @PutMapping("/students/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @RequestBody Student student) {
        try {
            Student existing = studentRepository.findById(id);
            if (existing == null) {
                return ResponseEntity.badRequest().body("Student not found");
            }
            
            existing.setName(student.getName());
            existing.setEmail(student.getEmail());
            if (student.getPassword() != null && !student.getPassword().isEmpty()) {
                existing.setPassword(passwordEncoder.encode(student.getPassword()));
            }
            existing.setYear(student.getYear());
            existing.setDeptId(student.getDeptId());
            
            studentRepository.update(existing);
            
            // NO BROADCAST: Student management is administrative
            log.info("Student updated with ID: {}", id);
            
            return ResponseEntity.ok("Student updated successfully");
        } catch (Exception e) {
            log.error("Error updating student: ", e);
            return ResponseEntity.badRequest().body("Error updating student: " + e.getMessage());
        }
    }
    
    // ==================== ROUND MANAGEMENT ====================
    
    @GetMapping("/rounds")
    public ResponseEntity<List<Round>> getAllRounds() {
        return ResponseEntity.ok(roundRepository.findAll());
    }
    
    @GetMapping("/rounds/{id}")
    public ResponseEntity<?> getRoundWithBids(@PathVariable Integer id) {
        try {
            Round round = roundRepository.findById(id);
            if (round == null) {
                return ResponseEntity.badRequest().body("Round not found");
            }
            
            RoundWithBidsDto dto = new RoundWithBidsDto();
            dto.setRoundId(round.getRoundId());
            dto.setRoundNumber(round.getRoundNumber());
            dto.setRoundName(round.getRoundName());
            dto.setStartTime(round.getStartTime());
            dto.setEndTime(round.getEndTime());
            dto.setStatus(round.getStatus());
            dto.setProcessedAt(round.getProcessedAt());
            
            // Get all bids for this round with student and course details
            List<Bid> bids = bidRepository.findByRoundId(id);
            dto.setTotalBids(bids.size());
            
            List<BidDetailsDto> bidDetails = bids.stream().map(bid -> {
                BidDetailsDto detail = new BidDetailsDto();
                detail.setBidId(bid.getBidId());
                detail.setStudentId(bid.getStudentId());
                detail.setCourseId(bid.getCourseId());
                detail.setRoundId(bid.getRoundId());
                detail.setBidAmount(bid.getBidAmount());
                detail.setStatus(bid.getStatus());
                detail.setPriority(bid.getPriority());
                detail.setCreatedAt(bid.getCreatedAt());
                
                // Get student details
                Student student = studentRepository.findById(bid.getStudentId());
                if (student != null) {
                    detail.setStudentName(student.getName());
                    detail.setStudentEmail(student.getEmail());
                }
                
                // Get course details
                Course course = courseRepository.findById(bid.getCourseId());
                if (course != null) {
                    detail.setCourseCode(course.getCourseCode());
                    detail.setCourseName(course.getCourseName());
                }
                
                return detail;
            }).collect(java.util.stream.Collectors.toList());
            
            dto.setBids(bidDetails);
            
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            log.error("Error fetching round with bids: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/rounds")
    public ResponseEntity<?> createRound(@RequestBody Round round) {
        try {
            log.info("Admin creating new round: {}", round.getRoundName());
            
            // Set default status if not provided
            if (round.getStatus() == null || round.getStatus().isEmpty()) {
                round.setStatus("pending");
            }
            
            Integer roundId = roundRepository.save(round);
            round.setRoundId(roundId);
            
            // BROADCAST: Round creation is an announcement
            notificationService.broadcastSystemNotification(
                "New Bidding Round Created",
                round.getRoundName() + " has been scheduled. Get ready to place your bids!"
            );
            
            return ResponseEntity.ok(round);
        } catch (Exception e) {
            log.error("Error creating round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PutMapping("/rounds/{id}")
    public ResponseEntity<?> updateRound(@PathVariable Integer id, @RequestBody Round round) {
        try {
            Round existing = roundRepository.findById(id);
            if (existing == null) {
                return ResponseEntity.badRequest().body("Round not found");
            }
            
            existing.setRoundName(round.getRoundName());
            existing.setRoundNumber(round.getRoundNumber());
            existing.setStartTime(round.getStartTime());
            existing.setEndTime(round.getEndTime());
            existing.setStatus(round.getStatus());
            
            roundRepository.update(existing);
            
            // NO BROADCAST: Round updates are administrative unless it's a status change
            log.info("Round updated with ID: {}", id);
            
            return ResponseEntity.ok(existing);
        } catch (Exception e) {
            log.error("Error updating round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @DeleteMapping("/rounds/{id}")
    public ResponseEntity<?> deleteRound(@PathVariable Integer id) {
        try {
            log.info("Admin deleting round: {}", id);
            roundRepository.delete(id);
            
            // NO BROADCAST: Round deletion is administrative
            
            return ResponseEntity.ok("Round deleted successfully");
        } catch (Exception e) {
            log.error("Error deleting round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PutMapping("/rounds/{id}/activate")
    public ResponseEntity<?> activateRound(@PathVariable Integer id) {
        try {
            log.info("Admin activating round: {}", id);
            Round round = roundRepository.findById(id);
            if (round == null) {
                return ResponseEntity.badRequest().body("Round not found");
            }
            
            roundRepository.updateStatus(id, "active");
            
            // BROADCAST: Round activation is an important announcement
            notificationService.broadcastSystemNotification(
                "🔔 Round Started: " + round.getRoundName(),
                "Bidding is now OPEN! Start placing your bids before the deadline."
            );
            
            return ResponseEntity.ok("Round activated successfully");
        } catch (Exception e) {
            log.error("Error activating round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/rounds/{id}/process")
    public ResponseEntity<?> processRound(@PathVariable Integer id) {
        try {
            log.info("Admin processing round: {}", id);
            roundService.processRound(id);
            
            // NOTE: The roundService.processRound() method already broadcasts a notification
            // when processing is complete, so we don't need to do it here
            
            return ResponseEntity.ok("Round processed successfully");
        } catch (Exception e) {
            log.error("Error processing round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    // ==================== BID MANAGEMENT ====================
    
    @GetMapping("/bids")
    public ResponseEntity<?> getAllBids() {
        try {
            List<BidResponseDto> bids = bidService.getAllBids();
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            log.error("Error fetching all bids: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping("/bids/round/{roundId}")
    public ResponseEntity<?> getBidsByRound(@PathVariable Integer roundId) {
        try {
            List<BidResponseDto> bids = bidService.getBidsByRound(roundId);
            return ResponseEntity.ok(bids);
        } catch (Exception e) {
            log.error("Error fetching bids by round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}