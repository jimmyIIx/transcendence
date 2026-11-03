package com.ft.transcendence.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Helper to extract objective metrics from a stored 42 profile snapshot
 * (the raw /v2/me payload serialized at OAuth login time).
 */
public final class FortyTwoProfileMetrics {

    public static final String METRIC_LEVEL = "LEVEL";
    public static final String METRIC_CORRECTION_POINT = "CORRECTION_POINT";
    public static final String METRIC_WALLET = "WALLET";
    public static final String METRIC_PROJECT_VALIDATED = "PROJECT_VALIDATED";

    private static final int DEFAULT_MAX_PROJECT_AGE_DAYS = 120;
    private static final List<String> DEFAULT_EXCLUDED_PROJECT_KEYWORDS = List.of("exam", "piscine", "rank");

    private static volatile int maxProjectAgeDays = DEFAULT_MAX_PROJECT_AGE_DAYS;
    private static volatile List<String> excludedProjectKeywords = DEFAULT_EXCLUDED_PROJECT_KEYWORDS;

    private FortyTwoProfileMetrics() {
    }

    /**
     * The 42 level is nested in {@code cursus_users[].level}. We return the
     * highest level found across all cursus (the most representative "current"
     * level for the user). Returns {@code defaultValue} when unavailable.
     */
    public static double readLevel(JsonNode snapshot, double defaultValue) {
        if (snapshot == null) {
            return defaultValue;
        }

        JsonNode cursusUsers = snapshot.get("cursus_users");
        double maxLevel = Double.NEGATIVE_INFINITY;
        if (cursusUsers != null && cursusUsers.isArray()) {
            for (JsonNode cursusUser : cursusUsers) {
                JsonNode levelNode = cursusUser.get("level");
                if (levelNode != null && levelNode.isNumber()) {
                    maxLevel = Math.max(maxLevel, levelNode.asDouble());
                }
            }
        }

        return maxLevel == Double.NEGATIVE_INFINITY ? defaultValue : maxLevel;
    }

    /**
     * Correction points are a top-level field in the 42 /v2/me payload.
     */
    public static int readCorrectionPoint(JsonNode snapshot, int defaultValue) {
        return readTopLevelInt(snapshot, "correction_point", defaultValue);
    }

    /**
     * Wallet is a top-level field in the 42 /v2/me payload.
     */
    public static int readWallet(JsonNode snapshot, int defaultValue) {
        return readTopLevelInt(snapshot, "wallet", defaultValue);
    }

    /**
     * Reads the current numeric value for a given metric type, or
     * {@code Double.NaN} when it cannot be determined.
     */
    public static double readMetric(JsonNode snapshot, String metricType) {
        if (snapshot == null || metricType == null) {
            return Double.NaN;
        }

        switch (metricType) {
            case METRIC_LEVEL:
                return readLevel(snapshot, Double.NaN);
            case METRIC_CORRECTION_POINT: {
                int value = readCorrectionPoint(snapshot, Integer.MIN_VALUE);
                return value == Integer.MIN_VALUE ? Double.NaN : value;
            }
            case METRIC_WALLET: {
                int value = readWallet(snapshot, Integer.MIN_VALUE);
                return value == Integer.MIN_VALUE ? Double.NaN : value;
            }
            default:
                return Double.NaN;
        }
    }

    private static int readTopLevelInt(JsonNode snapshot, String key, int defaultValue) {
        if (snapshot == null) {
            return defaultValue;
        }
        JsonNode value = snapshot.get(key);
        if (value != null && value.isNumber()) {
            return value.asInt();
        }
        return defaultValue;
    }

    /**
     * 42 project statuses that mean the project is currently being worked on and
     * is therefore a good subject for a "will they validate it?" market.
     */
    private static final java.util.Set<String> ACTIVE_PROJECT_STATUSES = java.util.Set.of(
            "in_progress", "searching_a_group", "creating_group", "waiting_for_correction"
    );

    public static void configureProjectFiltering(int maxAgeDays, List<String> excludedKeywords) {
        if (maxAgeDays > 0) {
            maxProjectAgeDays = maxAgeDays;
        } else {
            maxProjectAgeDays = DEFAULT_MAX_PROJECT_AGE_DAYS;
        }

        if (excludedKeywords == null || excludedKeywords.isEmpty()) {
            excludedProjectKeywords = DEFAULT_EXCLUDED_PROJECT_KEYWORDS;
            return;
        }

        List<String> normalized = excludedKeywords.stream()
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .map(keyword -> keyword.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toList());

        excludedProjectKeywords = normalized.isEmpty()
                ? DEFAULT_EXCLUDED_PROJECT_KEYWORDS
                : normalized;
    }

    /**
     * Returns the name of an ongoing 42 project (status in
     * {@link #ACTIVE_PROJECT_STATUSES}), or {@code null} when none is found.
     * Non-active entries (finished, failed, blackholed, etc.) are skipped so we
     * never build a market around an already-completed project.
     */
    public static String firstActiveProjectName(JsonNode snapshot) {
        java.util.List<String> names = activeProjectNames(snapshot);
        return names.isEmpty() ? null : names.get(0);
    }

    /**
     * Returns all active project names from the snapshot, in API order,
     * without duplicates.
     */
    public static java.util.List<String> activeProjectNames(JsonNode snapshot) {
        if (snapshot == null) {
            return java.util.List.of();
        }
        JsonNode projectsUsers = snapshot.get("projects_users");
        if (projectsUsers == null || !projectsUsers.isArray()) {
            return java.util.List.of();
        }

        long cutoffEpochMillis = Instant.now().minusSeconds((long) maxProjectAgeDays * 24L * 60L * 60L).toEpochMilli();
        Map<String, ProjectCandidate> byName = new HashMap<>();

        for (JsonNode projectUser : projectsUsers) {
            JsonNode statusNode = projectUser.get("status");
            if (statusNode == null || !statusNode.isTextual()
                    || !ACTIVE_PROJECT_STATUSES.contains(statusNode.asText())) {
                continue;
            }

            if (isProjectCompleted(projectUser)) {
                continue;
            }

            String name = projectName(projectUser);
            if (name == null || isExcludedProjectName(name)) {
                continue;
            }

            long updatedAtEpochMillis = extractUpdatedAtEpochMillis(projectUser);
            if (updatedAtEpochMillis > 0 && updatedAtEpochMillis < cutoffEpochMillis) {
                continue;
            }

            String key = name.toLowerCase(Locale.ROOT);
            ProjectCandidate current = byName.get(key);
            if (current == null || updatedAtEpochMillis > current.updatedAtEpochMillis) {
                byName.put(key, new ProjectCandidate(name, updatedAtEpochMillis));
            }
        }

        List<ProjectCandidate> candidates = new ArrayList<>(byName.values());
        candidates.sort(Comparator.comparingLong((ProjectCandidate c) -> c.updatedAtEpochMillis).reversed());

        List<String> result = new ArrayList<>();
        for (ProjectCandidate candidate : candidates) {
            result.add(candidate.name);
        }
        return result;
    }

    private static boolean isProjectCompleted(JsonNode projectUser) {
        JsonNode validated = projectUser.get("validated?");
        if (validated != null && validated.isBoolean() && validated.asBoolean()) {
            return true;
        }

        JsonNode validatedAt = projectUser.get("validated_at");
        if (validatedAt != null && !validatedAt.isNull()) {
            return true;
        }

        JsonNode finalMark = projectUser.get("final_mark");
        return finalMark != null && finalMark.isNumber() && finalMark.asInt() >= 100;
    }

    private static boolean isExcludedProjectName(String name) {
        String normalized = name.toLowerCase(Locale.ROOT);
        for (String keyword : excludedProjectKeywords) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private static long extractUpdatedAtEpochMillis(JsonNode projectUser) {
        long updated = parseDateNode(projectUser.get("updated_at"));
        if (updated > 0) {
            return updated;
        }
        long marked = parseDateNode(projectUser.get("marked_at"));
        if (marked > 0) {
            return marked;
        }
        return parseDateNode(projectUser.get("created_at"));
    }

    private static long parseDateNode(JsonNode dateNode) {
        if (dateNode == null || !dateNode.isTextual()) {
            return -1L;
        }

        String raw = dateNode.asText();
        if (raw.isBlank()) {
            return -1L;
        }

        try {
            return Instant.parse(raw).toEpochMilli();
        } catch (Exception ignored) {
            // Fallback for payloads without timezone offset.
        }

        try {
            return LocalDateTime.parse(raw, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    .toInstant(ZoneOffset.UTC)
                    .toEpochMilli();
        } catch (Exception ignored) {
            return -1L;
        }
    }

    private static final class ProjectCandidate {
        private final String name;
        private final long updatedAtEpochMillis;

        private ProjectCandidate(String name, long updatedAtEpochMillis) {
            this.name = name;
            this.updatedAtEpochMillis = updatedAtEpochMillis;
        }
    }

    /**
     * Returns whether the given project name has been validated in the snapshot.
     * A project is considered validated when its {@code validated?} flag is true
     * (falling back to a non-null {@code validated_at} / positive final mark).
     * Returns {@code false} when the project cannot be found.
     */
    public static boolean isProjectValidated(JsonNode snapshot, String projectName) {
        if (snapshot == null || projectName == null || projectName.isBlank()) {
            return false;
        }
        JsonNode projectsUsers = snapshot.get("projects_users");
        if (projectsUsers == null || !projectsUsers.isArray()) {
            return false;
        }
        for (JsonNode projectUser : projectsUsers) {
            String name = projectName(projectUser);
            if (name == null || !name.equalsIgnoreCase(projectName)) {
                continue;
            }
            JsonNode validated = projectUser.get("validated?");
            if (validated != null && validated.isBoolean()) {
                return validated.asBoolean();
            }
            JsonNode validatedAt = projectUser.get("validated_at");
            if (validatedAt != null && !validatedAt.isNull()) {
                return true;
            }
            JsonNode finalMark = projectUser.get("final_mark");
            return finalMark != null && finalMark.isNumber() && finalMark.asInt() >= 100;
        }
        return false;
    }

    private static String projectName(JsonNode projectUser) {
        JsonNode project = projectUser.get("project");
        if (project == null) {
            return null;
        }
        JsonNode nameNode = project.get("name");
        if (nameNode != null && nameNode.isTextual() && !nameNode.asText().isBlank()) {
            return nameNode.asText();
        }
        return null;
    }
}
