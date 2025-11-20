package com.project.cbs.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHasher {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "password";
        String hash = encoder.encode(password);
        System.out.println("BCrypt hash: " + hash);
        
        // Test if the hash matches
        boolean matches = encoder.matches(password, hash);
        System.out.println("Password matches: " + matches);
        
        // Test against the existing hash from database
        String existingHash = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";
        boolean existingMatches = encoder.matches(password, existingHash);
        System.out.println("Matches existing hash: " + existingMatches);
    }
}
