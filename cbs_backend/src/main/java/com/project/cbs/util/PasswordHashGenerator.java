package com.project.cbs.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        
        System.out.println("Password: password123");
        System.out.println("Hash: " + encoder.encode("password123"));
        System.out.println();
        
        System.out.println("Password: adminpass");
        System.out.println("Hash: " + encoder.encode("adminpass"));
    }
}
