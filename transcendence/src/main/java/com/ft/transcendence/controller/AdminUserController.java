package com.ft.transcendence.controller;

import com.ft.transcendence.dto.AdjustBalanceRequest;
import com.ft.transcendence.dto.CreateUserRequest;
import com.ft.transcendence.dto.UpdateUserRequest;
import com.ft.transcendence.dto.ChangeUserRoleRequest;
import com.ft.transcendence.model.Role;
import com.ft.transcendence.model.User;
import com.ft.transcendence.service.BlockchainService;
import com.ft.transcendence.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;
    private final BlockchainService blockchainService;

    //get users method
    //we call the method getAllUsers from the user service and return the list of users...
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    //get user per id method
    //we call the mothod getUserById from the user service and return the user with the given id...
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    //create user method
    //and so u understand the pattern ...
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody CreateUserRequest request, HttpServletRequest httpRequest) {
        try {
            User user = userService.createUser(
                    request.getUsername(),
                    request.getEmail(),
                    request.getPassword(),
                    request.getRole(),
                    resolveFrontendBaseUrl(httpRequest)
            );
            return ResponseEntity.ok(user);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    //update user method
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        User user = userService.updateUser(
                id,
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getRole(),
                request.getEmailVerified()
        );
        return ResponseEntity.ok(user);
    }

    //delete user method
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if(userService.getUserById(id).getRole() != Role.ADMIN)
            userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    //update user role method
    @PutMapping("/{id}/role")
    public ResponseEntity<User> changeUserRole(@PathVariable Long id, @RequestBody ChangeUserRoleRequest request) {
        User user = userService.changeUserRole(id, request.getRole());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/{id}/balance")
    public ResponseEntity<?> adjustBalance(@PathVariable Long id, @RequestBody AdjustBalanceRequest request) {
        try {
            User user = userService.adjustBalance(id, request.getDelta());

            Map<String, Object> mint = new HashMap<>();
            BigDecimal delta = request.getDelta();
            boolean credit = delta != null && delta.signum() > 0;

            if (!credit) {
                mint.put("status", "skipped");
                mint.put("reason", "Débit: aucun mint on-chain");
            } else if (!blockchainService.isEnabled()) {
                mint.put("status", "disabled");
                mint.put("reason", "Intégration blockchain désactivée (solde crédité uniquement en base)");
            } else if (user.getWalletAddress() == null || user.getWalletAddress().isBlank()) {
                mint.put("status", "no-wallet");
                mint.put("reason", "L'utilisateur n'a pas enregistré d'adresse de wallet");
            } else {
                try {
                    String txHash = blockchainService.mint(user.getWalletAddress(), delta);
                    mint.put("status", "sent");
                    mint.put("txHash", txHash);
                    mint.put("to", user.getWalletAddress());
                } catch (RuntimeException mintError) {
                    mint.put("status", "failed");
                    mint.put("reason", mintError.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("mint", mint);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    //send confirmation email method
    @PostMapping("/{id}/send-confirmation-email")
    public ResponseEntity<?> sendConfirmationEmail(@PathVariable Long id, HttpServletRequest request) {
        try {
            String frontendBaseUrl = resolveFrontendBaseUrl(request);
            userService.resendConfirmationEmail(id, frontendBaseUrl);
            return ResponseEntity.ok(Map.of("message", "Confirmation email sent successfully"));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private String resolveFrontendBaseUrl(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            return origin.replaceAll("/$", "");
        }

        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                java.net.URI uri = java.net.URI.create(referer);
                return uri.getScheme() + "://" + uri.getAuthority();
            } catch (IllegalArgumentException ignored) {
                // Fall back below.
            }
        }

        String scheme = request.getHeader("X-Forwarded-Proto");
        if (scheme == null || scheme.isBlank()) {
            scheme = request.getScheme();
        }

        return scheme + "://" + request.getServerName() + ":4200";
    }
}
