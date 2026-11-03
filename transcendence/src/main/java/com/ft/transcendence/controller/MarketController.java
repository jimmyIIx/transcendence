package com.ft.transcendence.controller;

import com.ft.transcendence.dto.MarketOrderBookResponse;
import com.ft.transcendence.dto.MarketOrderRequest;
import com.ft.transcendence.dto.MarketOrderResponse;
import com.ft.transcendence.dto.MarketResponse;
import com.ft.transcendence.dto.LeaderboardEntryResponse;
import com.ft.transcendence.dto.UserOrderResponse;
import com.ft.transcendence.service.MarketService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/markets")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class MarketController {

    private final MarketService marketService;

    public MarketController(MarketService marketService) {
        this.marketService = marketService;
    }

    @GetMapping
    public ResponseEntity<List<MarketResponse>> getMarkets() {
        return ResponseEntity.ok(marketService.getMarkets());
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(marketService.getDistinctCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MarketResponse> getMarket(@PathVariable Long id) {
        return ResponseEntity.ok(marketService.getMarket(id));
    }

    @GetMapping("/{id}/order-book")
    public ResponseEntity<MarketOrderBookResponse> getOrderBook(@PathVariable Long id) {
        return ResponseEntity.ok(marketService.getOrderBook(id));
    }

    @PostMapping("/{id}/orders")
    public ResponseEntity<MarketOrderResponse> placeOrder(
            @PathVariable Long id,
            Principal principal,
            @Valid @RequestBody MarketOrderRequest request
    ) {
        return ResponseEntity.ok(marketService.placeOrder(id, principal, request));
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<UserOrderResponse>> getMyOrders(Principal principal) {
        return ResponseEntity.ok(marketService.getMyOrders(principal));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntryResponse>> getLeaderboard() {
        return ResponseEntity.ok(marketService.getLeaderboard());
    }
}