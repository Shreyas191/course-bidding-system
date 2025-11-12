package com.project.cbs.controller;

import com.project.cbs.dto.LoginRequest;
import com.project.cbs.dto.LoginResponse;
import com.project.cbs.entity.Student;
import com.project.cbs.repository.StudentJdbcRepository;
import com.project.cbs.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private StudentJdbcRepository studentRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<Student> studentOpt = studentRepository.findByEmail(loginRequest.getEmail());

        if (studentOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password");
        }

        Student student = studentOpt.get();

        // Verify password
        if (!passwordEncoder.matches(loginRequest.getPassword(), student.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password");
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(student.getEmail(), student.getStudentId(), student.getRole());

        LoginResponse response = new LoginResponse(token, student.getStudentId(), student.getEmail(), student.getName(), student.getRole());
        return ResponseEntity.ok(response);
    }
}
