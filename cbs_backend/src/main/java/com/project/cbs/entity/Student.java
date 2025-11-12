package com.project.cbs.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "student")
@EntityListeners(AuditingEntityListener.class)
@Data
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "student_id")
    private Long studentId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    private String role; 

    @Column
    private Integer year;

    @ManyToOne
    @JoinColumn(name = "dept_id", nullable = false)
    private Department department;

    @OneToOne(mappedBy = "student", cascade = CascadeType.ALL)
    private Wallet wallet;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL)
    private List<Bid> bids;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL)
    private List<Enrollment> enrollments;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL)
    private List<WaitList> waitlists;

    // @CreatedDate
    // @Column(nullable = false, updatable = false)
    // private LocalDateTime createdAt;

    // @LastModifiedDate
    // @Column(nullable = false)
    // private LocalDateTime updatedAt;
}

