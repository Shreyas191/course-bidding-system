package com.project.cbs.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
	// TODO: Implement authentication endpoints
    // - POST /api/auth/register - Register new student
    // - POST /api/auth/login - Login student
    // - POST /api/auth/logout - Logout student
    // - GET /api/auth/me - Get current user
    // - POST /api/auth/refresh - Refresh token
}