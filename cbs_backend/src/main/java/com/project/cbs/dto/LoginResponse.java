package com.project.cbs.dto;

public class LoginResponse {
    private String token;
    private Long studentId;
    private String email;
    private String name;
    private String role; 

    // Constructors
    public LoginResponse() {}

    public LoginResponse(String token, Long studentId, String email, String name, String role) {
        this.token = token;
        this.studentId = studentId;
        this.email = email;
        this.name = name;
        this.role = role;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
