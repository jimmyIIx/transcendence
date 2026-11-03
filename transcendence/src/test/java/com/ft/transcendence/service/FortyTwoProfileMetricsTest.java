package com.ft.transcendence.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FortyTwoProfileMetricsTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @AfterEach
    void resetDefaults() {
        FortyTwoProfileMetrics.configureProjectFiltering(120, List.of("exam", "piscine", "rank"));
    }

    @Test
    void activeProjectNames_excludesCompletedAndLegacyExamEntries() throws Exception {
        String raw = """
                {
                  "projects_users": [
                    {
                      "status": "in_progress",
                      "updated_at": "2099-01-01T10:00:00.000Z",
                      "validated?": false,
                      "project": { "name": "ft_transcendence" }
                    },
                    {
                      "status": "waiting_for_correction",
                      "updated_at": "2099-01-01T10:00:00.000Z",
                      "validated?": false,
                      "project": { "name": "C Piscine Exam 02" }
                    },
                    {
                      "status": "in_progress",
                      "updated_at": "2099-01-01T10:00:00.000Z",
                      "validated?": true,
                      "project": { "name": "minishell" }
                    }
                  ]
                }
                """;

        JsonNode snapshot = OBJECT_MAPPER.readTree(raw);

        assertEquals(List.of("ft_transcendence"), FortyTwoProfileMetrics.activeProjectNames(snapshot));
    }

    @Test
    void activeProjectNames_usesConfigurableExcludedKeywords() throws Exception {
        FortyTwoProfileMetrics.configureProjectFiltering(365, List.of("legacy"));

        String raw = """
                {
                  "projects_users": [
                    {
                      "status": "in_progress",
                      "updated_at": "2099-01-01T10:00:00.000Z",
                      "validated?": false,
                      "project": { "name": "legacy_project" }
                    },
                    {
                      "status": "in_progress",
                      "updated_at": "2099-01-01T10:00:00.000Z",
                      "validated?": false,
                      "project": { "name": "new_core_project" }
                    }
                  ]
                }
                """;

        JsonNode snapshot = OBJECT_MAPPER.readTree(raw);

        assertEquals(List.of("new_core_project"), FortyTwoProfileMetrics.activeProjectNames(snapshot));
    }
}
