package com.ft.transcendence.controller;

import com.ft.transcendence.dto.CreateMarketRequest;
import com.ft.transcendence.dto.MarketResponse;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.UserRepository;
import com.ft.transcendence.service.FortyTwoProfileMetrics;
import com.ft.transcendence.service.MarketGenerationService;
import com.ft.transcendence.service.MarketService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/markets")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminMarketController {

    private final MarketService marketService;
    private final MarketGenerationService marketGenerationService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<List<MarketResponse>> getMarkets() {
        return ResponseEntity.ok(marketService.getMarkets());
    }

    /** Returns all users authenticated via 42 OAuth — used to populate the subject selector in the create-market form. */
    @GetMapping("/42-users")
    public ResponseEntity<List<Map<String, Object>>> get42Users() {
        List<Map<String, Object>> result = userRepository.findByOauthProvider("42").stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("oauthProviderId", u.getOauthProviderId());
                    m.put("avatarUrl", u.getAvatarUrl());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** Returns active project names for a specific 42 user (by oauth provider id). */
    @GetMapping("/42-users/{providerId}/active-projects")
    public ResponseEntity<List<String>> get42UserActiveProjects(@PathVariable String providerId) {
        Optional<User> subject = userRepository.findByOauthProviderAndOauthProviderId("42", providerId);
        if (subject.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        JsonNode snapshot = readSnapshot(subject.get().getOauthProfileSnapshot());
        if (snapshot == null) {
            return ResponseEntity.ok(List.of());
        }

        return ResponseEntity.ok(FortyTwoProfileMetrics.activeProjectNames(snapshot));
    }

    @PostMapping
    public ResponseEntity<MarketResponse> createMarket(@RequestBody CreateMarketRequest request) {
        return ResponseEntity.ok(marketService.createMarket(request));
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateMarkets() {
        int createdCount = marketGenerationService.generateMissingMarkets();
        return ResponseEntity.ok(Map.of(
                "message", createdCount > 0 ? "Markets generated" : "No new markets were needed",
                "createdCount", createdCount,
                "totalMarkets", marketService.getMarkets().size()
        ));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<MarketResponse> resolveMarket(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String outcome = body.get("outcome");
        return ResponseEntity.ok(marketService.resolveMarket(id, outcome));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMarket(@PathVariable Long id) {
        marketService.deleteMarket(id);
        return ResponseEntity.noContent().build();
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