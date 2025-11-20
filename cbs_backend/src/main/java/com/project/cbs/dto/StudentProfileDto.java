package com.project.cbs.dto;

public class StudentProfileDto {
    private Long studentId;
    private String name;
    private String email;
    private Integer year;
    private String department;
    private String role;
    private Integer bidPoints;

    public StudentProfileDto() {}

    public StudentProfileDto(Long studentId, String name, String email, Integer year, String department, String role, Integer bidPoints) {
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.year = year;
        this.department = department;
        this.role = role;
        this.bidPoints = bidPoints;
    }

    // Getters and Setters
    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Integer getBidPoints() { return bidPoints; }
    public void setBidPoints(Integer bidPoints) { this.bidPoints = bidPoints; }
}
