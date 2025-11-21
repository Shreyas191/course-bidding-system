package com.project.cbs.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Repository;
import jakarta.annotation.PostConstruct;

@Repository
@RequiredArgsConstructor
@Slf4j
public class AuctionRepository {

    private final JdbcTemplate jdbcTemplate;
    
    private SimpleJdbcCall processAuctionWinnersProc;
    
    @PostConstruct
    public void init() {
        processAuctionWinnersProc = new SimpleJdbcCall(jdbcTemplate)
            .withProcedureName("process_auction_winners");
    }
    
    /**
     * Process auction winners for a specific course in a round using stored procedure
     * The stored procedure handles:
     * 1. Selecting winning bids based on highest bid amounts (up to course capacity)
     * 2. Updating bid status to 'won' or 'lost'
     * 3. Creating enrollment records for winners
     * 4. Updating course enrollment count
     * 5. Deducting bid amounts from student wallets
     * 6. Adding losing bidders to waitlist
     * 
     * @param roundId The round ID to process
     * @param courseId The course ID to process
     */
    public void processAuctionWinners(Integer roundId, Integer courseId) {
        SqlParameterSource params = new MapSqlParameterSource()
            .addValue("p_round_id", roundId)
            .addValue("p_course_id", courseId);
        
        try {
            processAuctionWinnersProc.execute(params);
            log.info("Successfully processed auction winners for round {} and course {}", roundId, courseId);
        } catch (Exception e) {
            log.error("Error processing auction winners for round {} and course {}: {}", 
                     roundId, courseId, e.getMessage());
            throw new RuntimeException("Failed to process auction: " + e.getMessage());
        }
    }
}
