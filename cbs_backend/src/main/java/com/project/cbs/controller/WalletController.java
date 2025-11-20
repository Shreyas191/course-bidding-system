package com.project.cbs.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.cbs.dto.WalletDto;
import com.project.cbs.service.WalletService;

@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = "*")
public class WalletController {

    @Autowired
    private WalletService walletService;

    @GetMapping("/me")
    public ResponseEntity<?> getWalletBalance(@RequestHeader("Authorization") String authHeader) {
        try {
            WalletDto wallet = walletService.getWalletByToken(authHeader);
            return ResponseEntity.ok(wallet);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching wallet: " + e.getMessage());
        }
    }
}
