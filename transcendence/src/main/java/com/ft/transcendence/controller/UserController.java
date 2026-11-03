package com.ft.transcendence.controller;

import com.ft.transcendence.model.User;
import com.ft.transcendence.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Principal principal) {
        if (principal == null || principal.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userService.getUserByUsername(principal.getName());
        if (user == null) return ResponseEntity.notFound().build();
        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("balance", user.getBalance());
        response.put("role", user.getRole());
        response.put("walletAddress", user.getWalletAddress());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("oauthProvider", user.getOauthProvider());
        response.put("marketGenerationConsent", user.isMarketGenerationConsent());
        response.put(
            "canManageMarketConsent",
            "42".equals(user.getOauthProvider())
                && user.getOauthProfileSnapshot() != null
                && !user.getOauthProfileSnapshot().isBlank()
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/wallet")
    public ResponseEntity<?> updateWallet(Principal principal, @RequestBody Map<String, String> body) {
        if (principal == null || principal.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            User user = userService.updateWalletAddress(principal.getName(), body.get("walletAddress"));
            return ResponseEntity.ok(Map.of("walletAddress", user.getWalletAddress()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
}
