package com.ft.transcendence.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class MarketProjectFilterConfiguration {

    private final int maxAgeDays;
    private final String excludedKeywords;

    public MarketProjectFilterConfiguration(
            @Value("${markets.project-filter.max-age-days:120}") int maxAgeDays,
            @Value("${markets.project-filter.excluded-keywords:exam,piscine,rank}") String excludedKeywords
    ) {
        this.maxAgeDays = maxAgeDays;
        this.excludedKeywords = excludedKeywords;
    }

    @PostConstruct
    public void apply() {
        List<String> keywords = Arrays.stream(excludedKeywords.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toList());

        FortyTwoProfileMetrics.configureProjectFiltering(maxAgeDays, keywords);
    }
}
