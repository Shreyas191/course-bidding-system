package com.project.cbs.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.cbs.dto.StudentProfileDto;
import com.project.cbs.service.StudentServiceImpl;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {

    @Autowired
    private StudentServiceImpl studentService;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentStudentProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String email = studentService.extractEmailFromToken(authHeader);
            StudentProfileDto profile = studentService.getStudentProfile(email);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching profile: " + e.getMessage());
        }
    }
}
