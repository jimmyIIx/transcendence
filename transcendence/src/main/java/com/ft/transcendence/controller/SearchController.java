package com.ft.transcendence.controller;

import com.ft.transcendence.dto.MarketResponse;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.UserRepository;
import com.ft.transcendence.service.MarketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final MarketService marketService;
    private final UserRepository userRepository;

    public SearchController(MarketService marketService, UserRepository userRepository) {
        this.marketService = marketService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> search(@RequestParam(defaultValue = "") String q) {
        Map<String, Object> response = new HashMap<>();

        if (q == null || q.trim().length() < 2) {
            response.put("markets", List.of());
            response.put("users", List.of());
            return ResponseEntity.ok(response);
        }

        String query = q.trim();

        List<MarketResponse> markets = marketService.searchMarkets(query);

        List<Map<String, Object>> users = userRepository
                .findTop5ByUsernameContainingIgnoreCaseOrderByUsername(query)
                .stream()
                .map(u -> {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("username", u.getUsername());
                    userMap.put("avatarUrl", u.getAvatarUrl());
                    userMap.put("role", u.getRole() != null ? u.getRole().toString() : "USER");
                    return userMap;
                })
                .collect(Collectors.toList());

        response.put("markets", markets);
        response.put("users", users);
        return ResponseEntity.ok(response);
    }
}
