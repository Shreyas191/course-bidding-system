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
     * Check every minute if any round should be activated (NOT auto-close)
     */
    @Scheduled(fixedRate = 60000) // Run every minute
    public void checkAndUpdateRoundStatus() {
        try {
            Timestamp now = new Timestamp(System.currentTimeMillis());
            List<Round> allRounds = roundRepository.findAll();

            for (Round round : allRounds) {
                // ONLY auto-activate pending rounds when start time arrives
                // DO NOT auto-close - admin will close manually
                if ("pending".equalsIgnoreCase(round.getStatus()) && 
                    round.getStartTime() != null && 
                    now.after(round.getStartTime())) {
                    
                    round.setStatus("active");
                    roundRepository.update(round);
                    log.info("Auto-activated round: {} at {}", round.getRoundName(), now);
                    
                    // Send notification to all students
                    notificationService.sendNotificationToAll(
                        round.getRoundName() + " has started! You can now place your bids.",
                        "ROUND_STARTED"
                    );
                }
            }
        } catch (Exception e) {
            log.error("Error in round scheduler: ", e);
        }
    }
}
