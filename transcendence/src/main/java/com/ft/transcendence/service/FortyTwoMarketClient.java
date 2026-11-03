package com.ft.transcendence.service;

import com.ft.transcendence.dto.FortyTwoMarketSnapshot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class FortyTwoMarketClient {

    private final RestClient restClient;
    private final String mePath;
    private final String bearerToken;

    public FortyTwoMarketClient(
            @Value("${forty-two.api.base-url}") String baseUrl,
            @Value("${forty-two.api.me-path:/v2/me}") String mePath,
            @Value("${forty-two.api.bearer-token:}") String bearerToken
    ) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.mePath = mePath;
        this.bearerToken = bearerToken;
    }

    public Optional<FortyTwoMarketSnapshot> fetchSnapshot() {
        if (bearerToken == null || bearerToken.isBlank()) {
            return Optional.empty();
        }

        try {
            Map<String, Object> payload = restClient.get()
                    .uri(mePath)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                    .retrieve()
                    .body(Map.class);

            if (payload == null) {
                return Optional.empty();
            }

            return Optional.of(new FortyTwoMarketSnapshot(
                    readString(payload, "login"),
                    readLevel(payload),
                    readInteger(payload, "correction_point"),
                    readInteger(payload, "wallet"),
                    extractProjectNames(payload),
                    payload
            ));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private String readString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value instanceof String stringValue ? stringValue : null;
    }

    private Integer readInteger(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        return null;
    }

    private Double readLevel(Map<String, Object> payload) {
        Object cursusUsersValue = payload.get("cursus_users");
        double maxLevel = Double.NEGATIVE_INFINITY;
        if (cursusUsersValue instanceof List<?> cursusUsers) {
            for (Object cursusUser : cursusUsers) {
                if (cursusUser instanceof Map<?, ?> cursusUserMap) {
                    Object levelValue = cursusUserMap.get("level");
                    if (levelValue instanceof Number number) {
                        maxLevel = Math.max(maxLevel, number.doubleValue());
                    }
                }
            }
        }
        return maxLevel == Double.NEGATIVE_INFINITY ? null : maxLevel;
    }

    private List<String> extractProjectNames(Map<String, Object> payload) {
        Object projectsUsersValue = payload.get("projects_users");
        List<String> projectNames = new ArrayList<>();

        if (projectsUsersValue instanceof List<?> projectsUsers) {
            for (Object projectUser : projectsUsers) {
                if (projectUser instanceof Map<?, ?> projectUserMap) {
                    Object projectValue = projectUserMap.get("project");
                    if (projectValue instanceof Map<?, ?> projectMap) {
                        Object nameValue = projectMap.get("name");
                        if (nameValue instanceof String name && !name.isBlank()) {
                            projectNames.add(name);
                        }
                    }
                }
            }
        }

        return projectNames;
    }
}