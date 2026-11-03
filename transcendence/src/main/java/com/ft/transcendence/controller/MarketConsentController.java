package com.ft.transcendence.controller;

import com.ft.transcendence.model.User;
import com.ft.transcendence.service.MarketGenerationService;
import com.ft.transcendence.service.UserService;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users/me/market-consent")
public class MarketConsentController {

    private final UserService userService;
    private final MarketGenerationService marketGenerationService;

    public MarketConsentController(UserService userService, MarketGenerationService marketGenerationService) {
        this.userService = userService;
        this.marketGenerationService = marketGenerationService;
    }

    @PostMapping
    public ResponseEntity<?> enableConsent(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentification requise"));
        }

        try {
            User user = userService.enableMarketGenerationConsent(authentication.getName());
            marketGenerationService.generateMissingMarkets();
            return ResponseEntity.ok(Map.of(
                "message", "Consentement à la génération des marchés activé",
                    "username", user.getUsername(),
                    "consent", user.isMarketGenerationConsent()
            ));
        } catch (ResponseStatusException ex) {
            String message = ex.getReason() != null ? ex.getReason() : "Requête invalide";
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> revokeConsent(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentification requise"));
        }

        try {
            User user = userService.revokeMarketGenerationConsent(authentication.getName());
            return ResponseEntity.ok(Map.of(
                "message", "Consentement à la génération des marchés révoqué",
                    "username", user.getUsername(),
                    "consent", user.isMarketGenerationConsent()
            ));
        } catch (ResponseStatusException ex) {
            String message = ex.getReason() != null ? ex.getReason() : "Requête invalide";
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message));
        }
    }
}