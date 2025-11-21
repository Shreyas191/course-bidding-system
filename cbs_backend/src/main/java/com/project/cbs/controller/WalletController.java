package com.project.cbs.controller;

import com.project.cbs.dto.WalletDto;
import com.project.cbs.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/me")
    public ResponseEntity<?> getWalletBalance(@RequestHeader("Authorization") String authHeader) {
        try {
            WalletDto wallet = walletService.getWalletByToken(authHeader);
            return ResponseEntity.ok(wallet);
        } catch (Exception e) {
            log.error("Error fetching wallet: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
