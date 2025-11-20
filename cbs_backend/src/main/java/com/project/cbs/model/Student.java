package com.project.cbs.model;

import lombok.Data;

@Data
public class Student {
    private Long studentId;
    private String name;
    private String email;
    private String password;
    private String role;
    private Integer year;
    private Integer deptId;
}
