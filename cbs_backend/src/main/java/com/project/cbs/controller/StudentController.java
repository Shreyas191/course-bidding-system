package com.project.cbs.controller;

import com.project.cbs.entity.Student;
import com.project.cbs.repository.StudentJdbcRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {

    @Autowired
    private StudentJdbcRepository studentRepository;

    @GetMapping
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    @GetMapping("/{id}")
    public Optional<Student> getStudentById(@PathVariable Long id) {
        return studentRepository.findById(id);
    }

    @PostMapping
    public String createStudent(@RequestBody Student student) {
        int rows = studentRepository.save(student);
        return rows > 0 ? "Student created successfully" : "Error creating student";
    }

    @PutMapping("/{id}")
    public String updateStudent(@PathVariable Long id, @RequestBody Student student) {
        int rows = studentRepository.update(id, student);
        return rows > 0 ? "Student updated successfully" : "Error updating student";
    }

    @DeleteMapping("/{id}")
    public String deleteStudent(@PathVariable Long id) {
        int rows = studentRepository.delete(id);
        return rows > 0 ? "Student deleted successfully" : "Error deleting student";
    }

    @GetMapping("/{id}/profile")
    public Optional<Student> getStudentProfile(@PathVariable Long id) {
        return studentRepository.findProfileById(id);
    }
}
