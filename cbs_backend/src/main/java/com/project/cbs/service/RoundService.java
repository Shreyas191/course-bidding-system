package com.project.cbs.service;

import com.project.cbs.dto.RoundDto;
import com.project.cbs.model.Round;

import java.util.List;

public interface RoundService {
    List<RoundDto> getAllRounds();
    RoundDto getCurrentRound();
    RoundDto createRound(Round round);
    void activateRound(Integer roundId);
    void processRound(Integer roundId);
    RoundDto getRoundById(Integer roundId);
}
