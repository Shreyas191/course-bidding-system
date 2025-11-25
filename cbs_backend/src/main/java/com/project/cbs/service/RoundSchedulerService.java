package com.project.cbs.service;

import com.project.cbs.model.Round;
import com.project.cbs.repository.RoundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoundSchedulerService {

    private final RoundRepository roundRepository;
    private final NotificationService notificationService;

    /**
     * Check every minute for rounds that need status updates
     * - Activate pending rounds when start time arrives
     * - Close active rounds when end time arrives
     */
    @Scheduled(fixedRate = 60000) // Run every minute (60,000 ms)
    public void checkAndUpdateRoundStatus() {
        try {
            Timestamp now = new Timestamp(System.currentTimeMillis());
            List<Round> allRounds = roundRepository.findAll();

            for (Round round : allRounds) {
                String oldStatus = round.getStatus();
                boolean statusChanged = false;

                // AUTO-ACTIVATE: pending → active when start time arrives
                if ("pending".equalsIgnoreCase(round.getStatus()) && 
                    round.getStartTime() != null && 
                    now.after(round.getStartTime())) {
                    
                    round.setStatus("active");
                    roundRepository.updateStatus(round.getRoundId(), "active");
                    statusChanged = true;
                    
                    log.info("⏰ AUTO-ACTIVATED round {} '{}' at {}", 
                        round.getRoundId(), round.getRoundName(), now);
                    
                    // Notify students that round has started
                    notificationService.broadcastSystemNotification(
                        "🔔 Round Started: " + round.getRoundName(),
                        "Bidding is now OPEN! Start placing your bids before the deadline."
                    );
                }
                
                // AUTO-CLOSE: active → closed when end time arrives
                else if ("active".equalsIgnoreCase(round.getStatus()) && 
                         round.getEndTime() != null && 
                         now.after(round.getEndTime())) {
                    
                    round.setStatus("closed");
                    roundRepository.updateStatus(round.getRoundId(), "closed");
                    statusChanged = true;
                    
                    log.info("⏰ AUTO-CLOSED round {} '{}' at {}", 
                        round.getRoundId(), round.getRoundName(), now);
                    
                    // Notify students that round has closed
                    notificationService.broadcastSystemNotification(
                        "⏱️ Round Closed: " + round.getRoundName(),
                        "Bidding has ended for " + round.getRoundName() + ". " +
                        "Results will be published soon by the admin."
                    );
                }

                if (statusChanged) {
                    log.info("Round {} status changed: {} → {}", 
                        round.getRoundId(), oldStatus, round.getStatus());
                }
            }
        } catch (Exception e) {
            log.error("Error in round scheduler: ", e);
        }
    }
}