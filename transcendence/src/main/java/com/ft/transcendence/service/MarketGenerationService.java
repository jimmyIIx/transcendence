package com.ft.transcendence.service;

import com.ft.transcendence.dto.FortyTwoMarketSnapshot;
import com.ft.transcendence.model.Market;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.MarketRepository;
import com.ft.transcendence.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class MarketGenerationService {

    private final MarketRepository marketRepository;
    private final FortyTwoMarketClient fortyTwoMarketClient;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final int targetCount;
    private final boolean enabled;

    public MarketGenerationService(
            MarketRepository marketRepository,
            FortyTwoMarketClient fortyTwoMarketClient,
            UserRepository userRepository,
            ObjectMapper objectMapper,
            @Value("${markets.generator.target-count:12}") int targetCount,
            @Value("${markets.generator.enabled:true}") boolean enabled
    ) {
        this.marketRepository = marketRepository;
        this.fortyTwoMarketClient = fortyTwoMarketClient;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.targetCount = targetCount;
        this.enabled = enabled;
    }

    @Order(2)
    @EventListener(ApplicationReadyEvent.class)
    public void seedOnStartup() {
        generateMissingMarkets();
    }

    @Scheduled(cron = "${markets.generator.cron:0 0 */6 * * ?}")
    public void scheduledRefresh() {
        generateMissingMarkets();
    }

    @Transactional
    public synchronized int generateMissingMarkets() {
        if (!enabled) {
            return 0;
        }

        // Budget against ALL unresolved 42 markets (fallbacks included) so the
        // active pool stays bounded at target-count and never grows unbounded.
        long currentCount = marketRepository.countBySourceSystemAndResolvedFalse("42");
        if (currentCount >= targetCount) {
            return 0;
        }

        List<MarketIdea> ideas = buildIdeas(fortyTwoMarketClient.fetchSnapshot());
        int remaining = targetCount - (int) currentCount;
        int createdCount = 0;

        for (MarketIdea idea : ideas) {
            if (remaining <= 0) {
                break;
            }

            // Skip if an open market already exists for this key.
            // Also skip if the most recent market for this key (even resolved) still
            // has a future end date — regenerating before the period ends creates
            // confusing duplicates visible to users.
            Optional<Market> latest = marketRepository.findTopBySourceKeyOrderByCreatedAtDesc(idea.sourceKey());
            if (latest.isPresent()) {
                Market m = latest.get();
                if (!m.isResolved()) continue;
                if (m.getEndDate() != null && m.getEndDate().isAfter(LocalDateTime.now())) continue;
            }

            Market market = new Market();
            market.setQuestion(idea.question());
            market.setCategory(idea.category());
            market.setDescription(idea.description());
            market.setSourceSystem("42");
            market.setSourceKey(idea.sourceKey());
            market.setEndDate(idea.endDate());
            market.setResolved(false);
            market.setMetricType(idea.metricType());
            market.setTargetValue(idea.targetValue());
            market.setSubjectProviderId(idea.subjectProviderId());
            market.setSubjectContext(idea.subjectContext());
            marketRepository.save(market);
            remaining--;
            createdCount++;
        }

        return createdCount;
    }

    private List<MarketIdea> buildIdeas(Optional<FortyTwoMarketSnapshot> snapshotOptional) {
        List<MarketIdea> ideas = new ArrayList<>(buildIdeasFromConsentingUsers());

        if (snapshotOptional.isPresent() && ideas.size() < targetCount) {
            ideas.addAll(buildIdeasFromSnapshot(snapshotOptional.get(), "42-app", "42 app"));
        }

        return ideas;
    }

    private List<MarketIdea> buildIdeasFromConsentingUsers() {
        List<MarketIdea> ideas = new ArrayList<>();
        List<User> consentingUsers = userRepository.findByOauthProviderAndMarketGenerationConsentTrue("42");

        for (User user : consentingUsers) {
            JsonNode snapshot = readSnapshot(user.getOauthProfileSnapshot());
            if (snapshot == null) {
                continue;
            }

            String identity = safeString(user.getOauthProviderId(), user.getUsername());
            String login = textValue(snapshot, "login", user.getUsername());
            double level = FortyTwoProfileMetrics.readLevel(snapshot, 1.0);
            int correctionPoints = intValue(snapshot, "correction_point", 0);
            int wallet = intValue(snapshot, "wallet", 0);
            String projectName = FortyTwoProfileMetrics.firstActiveProjectName(snapshot);

            ideas.addAll(buildIdeasFromFields(identity, user.getOauthProviderId(), login, level, correctionPoints, wallet, projectName));
        }

        return ideas;
    }

    private List<MarketIdea> buildIdeasFromSnapshot(FortyTwoMarketSnapshot snapshot, String identity, String defaultLogin) {
        String login = snapshot.login() == null || snapshot.login().isBlank() ? defaultLogin : snapshot.login();
        double level = snapshot.level() == null ? 1.0 : snapshot.level();
        int correctionPoints = snapshot.correctionPoints() == null ? 0 : snapshot.correctionPoints();
        int wallet = snapshot.wallet() == null ? 0 : snapshot.wallet();
        String projectName = snapshot.projectNames().isEmpty() ? null : snapshot.projectNames().get(0);

        return buildIdeasFromFields(identity, null, login, level, correctionPoints, wallet, projectName);
    }

    private List<MarketIdea> buildIdeasFromFields(String identity, String subjectProviderId, String login, double level, int correctionPoints, int wallet, String projectName) {
        List<MarketIdea> ideas = new ArrayList<>();

        // A PROJECT market can only be auto-resolved when we know both the real
        // 42 subject (providerId) and an actual ongoing project name.
        boolean projectResolvable = subjectProviderId != null
                && projectName != null && !projectName.isBlank();
        String projectDisplay = (projectName != null && !projectName.isBlank())
                ? projectName : "son prochain projet";

        ideas.add(new MarketIdea(
                "PROJECT",
                login + " validera-t-il " + projectDisplay + " avant la fin de la semaine ?",
                "Market genere a partir des projets 42 en cours",
                key("project", identity, projectDisplay),
                LocalDateTime.now().plusDays(7),
                projectResolvable ? FortyTwoProfileMetrics.METRIC_PROJECT_VALIDATED : null,
                projectResolvable ? 1.0 : null,
                projectResolvable ? subjectProviderId : null,
                projectResolvable ? projectName : null
        ));
        ideas.add(new MarketIdea(
                "EXAM",
                login + " passera-t-il son prochain exam 42 du premier coup ?",
                "Market exam construit a partir du profil 42",
                key("exam", identity, String.valueOf(Math.round(level))),
                LocalDateTime.now().plusDays(5),
                null,
                null,
                null,
                null
        ));
        double levelTarget = Math.ceil(level + 1);
        ideas.add(new MarketIdea(
                "PROGRESSION",
                login + " atteindra-t-il le niveau " + levelTarget + " avant la fin du mois ?",
                "Market de progression base sur le niveau 42",
                key("level", identity, String.valueOf(levelTarget)),
                LocalDateTime.now().plusDays(14),
                FortyTwoProfileMetrics.METRIC_LEVEL,
                levelTarget,
                subjectProviderId,
                null
        ));
        int correctionTarget = correctionPoints + 10;
        ideas.add(new MarketIdea(
                "EXP",
                login + " gagnera-t-il au moins " + correctionTarget + " points de correction cette semaine ?",
                "Market d'exp/correction points base sur le profil 42",
                key("correction", identity, String.valueOf(correctionTarget)),
                LocalDateTime.now().plusDays(7),
                FortyTwoProfileMetrics.METRIC_CORRECTION_POINT,
                (double) correctionTarget,
                subjectProviderId,
                null
        ));
        int walletTarget = wallet + 100;
        ideas.add(new MarketIdea(
                "PROGRESS",
                login + " depassera-t-il " + walletTarget + " points de wallet avant le prochain checkpoint ?",
                "Market proxy pour suivre la progression globale 42",
                key("wallet", identity, String.valueOf(walletTarget)),
                LocalDateTime.now().plusDays(10),
                FortyTwoProfileMetrics.METRIC_WALLET,
                (double) walletTarget,
                subjectProviderId,
                null
        ));
        return ideas;
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

    private String textValue(JsonNode node, String key, String defaultValue) {
        JsonNode value = node.get(key);
        if (value != null && value.isTextual() && !value.asText().isBlank()) {
            return value.asText();
        }
        return defaultValue;
    }

    private int intValue(JsonNode node, String key, int defaultValue) {
        JsonNode value = node.get(key);
        if (value != null && value.isNumber()) {
            return value.asInt();
        }
        return defaultValue;
    }

    private String safeString(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    private String key(String category, String first, String second) {
        return (category + "-" + first + "-" + second)
                .toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private record MarketIdea(String category, String question, String description, String sourceKey, LocalDateTime endDate,
                              String metricType, Double targetValue, String subjectProviderId, String subjectContext) {
    }
}