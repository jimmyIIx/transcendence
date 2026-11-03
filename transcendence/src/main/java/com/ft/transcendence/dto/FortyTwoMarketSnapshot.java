package com.ft.transcendence.dto;

import java.util.List;
import java.util.Map;

public record FortyTwoMarketSnapshot(
        String login,
        Double level,
        Integer correctionPoints,
        Integer wallet,
        List<String> projectNames,
        Map<String, Object> raw
) {
}