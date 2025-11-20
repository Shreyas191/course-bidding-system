package com.project.cbs.model;

import lombok.Data;
import java.sql.Timestamp;

@Data
public class Department {
    private Integer deptId;
    private String deptName;
    private String deptCode;
    private Timestamp createdAt;
}
