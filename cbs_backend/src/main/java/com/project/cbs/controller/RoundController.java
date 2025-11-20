package com.project.cbs.controller;

import com.project.cbs.dto.RoundDto;
import com.project.cbs.model.Round;
import com.project.cbs.service.RoundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rounds")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class RoundController {

    private final RoundService roundService;

    @GetMapping
    public ResponseEntity<?> getAllRounds() {
        try {
            List<RoundDto> rounds = roundService.getAllRounds();
            return ResponseEntity.ok(rounds);
        } catch (Exception e) {
            log.error("Error fetching rounds: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentRound() {
        try {
            RoundDto round = roundService.getCurrentRound();
            if (round == null) {
                return ResponseEntity.ok().body(null);
            }
            return ResponseEntity.ok(round);
        } catch (Exception e) {
            log.error("Error fetching current round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRoundById(@PathVariable Integer id) {
        try {
            RoundDto round = roundService.getRoundById(id);
            return ResponseEntity.ok(round);
        } catch (Exception e) {
            log.error("Error fetching round: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishResults(@PathVariable Integer id) {
        try {
            log.info("Publishing results for round {}", id);
            roundService.processRound(id);
            return ResponseEntity.ok().body("Round results published successfully");
        } catch (Exception e) {
            log.error("Error publishing round results: ", e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
