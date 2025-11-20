package com.project.cbs.dto;

import lombok.Data;

@Data
public class StudentDetailsDto {
    private Long studentId;
    private String name;
    private String email;
    private String role;
    private Integer year;
    private Integer deptId;
    private String departmentName;
    private String departmentCode;
    private Integer bidPoints;
    
    // Helper method to get year as text
    public String getYearText() {
        if (year == null) return "N/A";
        switch (year) {
            case 1: return "1st Year";
            case 2: return "2nd Year";
            case 3: return "3rd Year";
            case 4: return "4th Year";
            default: return year + "th Year";
        }
    }
}
