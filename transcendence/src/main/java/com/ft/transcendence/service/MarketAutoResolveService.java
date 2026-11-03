package com.ft.transcendence.service;

import com.ft.transcendence.model.Market;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.MarketRepository;
import com.ft.transcendence.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MarketAutoResolveService {

    private static final Logger logger = LoggerFactory.getLogger(MarketAutoResolveService.class);

    private static final String OUTCOME_YES = "YES";
    private static final String OUTCOME_NO = "NO";

    private final MarketRepository marketRepository;
    private final MarketService marketService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public MarketAutoResolveService(
            MarketRepository marketRepository,
            MarketService marketService,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.marketRepository = marketRepository;
        this.marketService = marketService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Runs frequently so an expired market is resolved shortly after its end date.
     * Each market is resolved in its own transaction (via
     * {@link MarketService#resolveMarket}) so that a failure on one market does
     * not roll back the others, and so winners are actually paid out.
     */
    @Scheduled(fixedDelayString = "${markets.auto-resolve.fixed-delay-ms:60000}")
    public void resolveExpiredMarkets() {
        List<Market> expired = marketRepository.findByResolvedFalseAndEndDateBefore(LocalDateTime.now());
        if (expired.isEmpty()) {
            return;
        }

        logger.info("Checking {} expired market(s) for auto-resolution", expired.size());

        for (Market market : expired) {
            String outcome = resolveOutcome(market);

            if (outcome == null) {
                logger.info("Market {} ('{}') has no objective 42 metric to resolve; leaving it open for manual admin resolution",
                        market.getId(), market.getQuestion());
                continue;
            }

            try {
                marketService.resolveMarket(market.getId(), outcome);
                logger.info("Market {} ('{}') auto-resolved as {} (end date was {})",
                        market.getId(), market.getQuestion(), outcome, market.getEndDate());
            } catch (Exception e) {
                logger.error("Failed to auto-resolve market {} ('{}')", market.getId(), market.getQuestion(), e);
            }
        }
    }

    /**
     * Determines the objective outcome of a market, or {@code null} when it
     * cannot be resolved from 42 data (project/exam/fallback markets, missing
     * subject or snapshot). Such markets are left untouched for an admin to
     * resolve manually rather than being unfairly settled as {@code NO}.
     *
     * <p>Supported objective metrics: level, correction points, wallet
     * (numeric threshold) and project validation (boolean).
     */
    private String resolveOutcome(Market market) {
        String metricType = market.getMetricType();
        String providerId = market.getSubjectProviderId();

        if (metricType == null || providerId == null) {
            return null;
        }

        Optional<User> subject = userRepository.findByOauthProviderAndOauthProviderId("42", providerId);
        if (subject.isEmpty()) {
            logger.warn("Market {} has no resolvable 42 user (providerId={}), leaving for manual resolution",
                    market.getId(), providerId);
            return null;
        }

        JsonNode snapshot = readSnapshot(subject.get().getOauthProfileSnapshot());
        if (snapshot == null) {
            logger.warn("Market {} subject has no 42 profile snapshot, leaving for manual resolution", market.getId());
            return null;
        }

        if (FortyTwoProfileMetrics.METRIC_PROJECT_VALIDATED.equals(metricType)) {
            String projectName = market.getSubjectContext();
            if (projectName == null || projectName.isBlank()) {
                logger.warn("Market {} is PROJECT_VALIDATED but has no project name, leaving for manual resolution",
                        market.getId());
                return null;
            }
            boolean validated = FortyTwoProfileMetrics.isProjectValidated(snapshot, projectName);
            logger.info("Market {} project '{}' validated={} -> {}",
                    market.getId(), projectName, validated, validated ? OUTCOME_YES : OUTCOME_NO);
            return validated ? OUTCOME_YES : OUTCOME_NO;
        }

        Double target = market.getTargetValue();
        if (target == null) {
            return null;
        }

        double current = FortyTwoProfileMetrics.readMetric(snapshot, metricType);
        if (Double.isNaN(current)) {
            logger.warn("Market {} could not read metric {} from 42 snapshot, leaving for manual resolution",
                    market.getId(), metricType);
            return null;
        }

        boolean reached = current >= target;
        logger.info("Market {} metric {}: current={} target={} -> {}",
                market.getId(), metricType, current, target, reached ? OUTCOME_YES : OUTCOME_NO);
        return reached ? OUTCOME_YES : OUTCOME_NO;
    }

    private JsonNode readSnapshot(String snapshotJson) {
        if (snapshotJson == null || snapshotJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(snapshotJson);
        } catch (Exception exception) {
            return null;
        }
    }
}
