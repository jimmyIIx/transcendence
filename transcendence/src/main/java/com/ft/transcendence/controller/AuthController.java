package com.ft.transcendence.controller;

import com.ft.transcendence.dto.*;
import com.ft.transcendence.model.RefreshToken;
import com.ft.transcendence.model.User;
import com.ft.transcendence.security.RateLimiter;
import com.ft.transcendence.service.*;
import org.springframework.beans.factory.annotation.Value;
import com.ft.transcendence.utils.JwtUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Date;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final JwtUtils jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final RateLimiter rateLimiter;
    private final JwtBlacklistService jwtBlacklistService;
    private final AuditLogService auditLogService;

    public AuthController(AuthService authService, JwtUtils jwtUtil,
                         RefreshTokenService refreshTokenService, RateLimiter rateLimiter,
                         JwtBlacklistService jwtBlacklistService, AuditLogService auditLogService) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.rateLimiter = rateLimiter;
        this.jwtBlacklistService = jwtBlacklistService;
        this.auditLogService = auditLogService;
    }

    @Value("${server.ssl.enabled:false}")
    private boolean sslEnabled;

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

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        // handle user registration request
        try {
            String frontendBaseUrl = resolveFrontendBaseUrl(servletRequest);
            User user = authService.register(
                    request.getUsername(),
                    request.getEmail(),
                    request.getPassword(),
                    frontendBaseUrl
            );
            auditLogService.logRegistration(user.getUsername(), user.getEmail());
            return ResponseEntity.ok(Map.of(
                    "message", "Registration successful! Please check your email to confirm.",
                    "username", user.getUsername(),
                    "email", user.getEmail()
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Registration validation failed for {}: {}", request.getUsername(), e.getMessage());
            auditLogService.logAction("REGISTER", request.getUsername(), "FAILED", null, e.getMessage());
            return ResponseEntity.status(400).body(
                    Map.of("error", e.getMessage())
            );
        } catch (RuntimeException e) {
            log.warn("Registration failed for {}: {}", request.getUsername(), e.getMessage());
            return ResponseEntity.status(400).body(
                    Map.of("error", e.getMessage())
            );
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest servletRequest,
                                   HttpServletResponse response) {
        // authenticate user and return access token with refresh cookie
        String identifier = request.getUsername().toLowerCase();
        // check rate limiting
        if (rateLimiter.isLimited(identifier)) {
            long secondsBeforeRetry = rateLimiter.getTimeBeforeRetry(identifier);
            return ResponseEntity.status(429).body(Map.of(
                    "error", "Too many login attempts. Please try again in " + secondsBeforeRetry + " seconds",
                    "retryAfter", secondsBeforeRetry
            ));
        }

        try {
            User user = authService.authenticate(request.getUsername(), request.getPassword());
            // reset rate limit on successful login
            rateLimiter.resetAttempts(identifier);
            String clientIp = resolveClientIp(servletRequest);
            auditLogService.logLoginSuccess(user.getUsername(), clientIp);

            String accessToken = jwtUtil.generateAccessToken(user.getUsername(), user.getRole().toString());
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getUsername());
            // create httpOnly cookie for refresh token
                ResponseCookie cookie = ResponseCookie
                    .from("refreshToken", refreshToken.getToken())
                    .httpOnly(true)
                    .secure(sslEnabled)
                    .path("/auth")
                    .maxAge(7 * 24 * 60 * 60) // 7 days
                    .sameSite("Lax")
                    .build();

            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            LoginResponse loginResponse = new LoginResponse(
                    accessToken,
                    null, // dont send refresh token in body
                    jwtUtil.getAccessTokenExpirationTime() / 1000 // in seconds
            );

            return ResponseEntity.ok(loginResponse);
        } catch (RuntimeException e) {
            // record failed attempt
            rateLimiter.recordAttempt(identifier);
            String clientIp = resolveClientIp(servletRequest);
            auditLogService.logLoginFailure(identifier, clientIp, e.getMessage());
            int remaining = rateLimiter.getRemainingAttempts(identifier);

            return ResponseEntity.status(401).body(Map.of(
                    "error", e.getMessage(),
                    "attemptsRemaining", remaining
            ));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        try {
            // get refresh token from cookie
            String refreshTokenValue = null;
            if (request.getCookies() != null) {
                for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                    if ("refreshToken".equals(cookie.getName())) {
                        refreshTokenValue = cookie.getValue();
                        break;
                    }
                }
            }

            if (refreshTokenValue == null) {
                throw new RuntimeException("Jeton de rafraîchissement introuvable dans les cookies");
               }

            RefreshToken refreshToken = refreshTokenService.findByToken(refreshTokenValue)
                    .orElseThrow(() -> new RuntimeException("Jeton de rafraîchissement invalide"));

            RefreshToken verifiedToken = refreshTokenService.verifyRefreshToken(refreshToken);

            String newAccessToken = jwtUtil.generateAccessToken(verifiedToken.getUser().getUsername(), verifiedToken.getUser().getRole().toString());

                // Rotate refresh token: create a new one and set it in cookie
                RefreshToken newRefresh = refreshTokenService.createRefreshToken(verifiedToken.getUser().getUsername());

                ResponseCookie cookie = ResponseCookie
                    .from("refreshToken", newRefresh.getToken())
                    .httpOnly(true)
                    .secure(sslEnabled)
                    .path("/auth")
                    .maxAge(7 * 24 * 60 * 60) // 7 days
                    .sameSite("Lax")
                    .build();

                response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            LoginResponse loginResponse = new LoginResponse(
                    newAccessToken,
                    null, // Don't send refresh token in body
                    jwtUtil.getAccessTokenExpirationTime() / 1000 // in seconds
            );

            return ResponseEntity.ok(loginResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(
                    Map.of("error", e.getMessage())
            );
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                    HttpServletRequest servletRequest,
                                    HttpServletResponse response) {
        try {
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String username = jwtUtil.extractUsername(token);
                Date expiryDate = jwtUtil.getExpirationDate(token);
                
                // Blacklist the token
                jwtBlacklistService.blacklistToken(token, expiryDate.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime(), username);
                
                // Delete refresh token from DB
                refreshTokenService.deleteRefreshToken(username);
                
                // Log logout
                auditLogService.logLogout(username, resolveClientIp(servletRequest));
            }

            // clear the refresh token cookie
                ResponseCookie cookie = ResponseCookie
                    .from("refreshToken", "")
                    .httpOnly(true)
                    .secure(sslEnabled)
                    .path("/auth")
                    .maxAge(0)
                    .sameSite("Lax")
                    .build();

            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(
                    Map.of("error", "Logout failed: " + e.getMessage())
            );
        }
    }

    @PostMapping("/resend/confirmation-email")
    public ResponseEntity<?> resendConfirmationEmail(@RequestParam String email, HttpServletRequest servletRequest) {
        try {
            authService.resendConfirmationEmail(email, resolveFrontendBaseUrl(servletRequest));
            return ResponseEntity.ok(Map.of(
                    "message", "Confirmation email resent. Please check your email."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(
                    Map.of("error", e.getMessage())
            );
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of(
                    "message", "If this email exists, a confirmation email has been resent."
            ));
        }
    }

    @GetMapping("/confirm-email/{token}")
    public ResponseEntity<?> confirmEmail(@PathVariable String token) {
        try {
            User user = authService.confirmEmail(token);
            return ResponseEntity.ok(Map.of(
                    "message", "Email confirmed successfully! You can now login.",
                    "username", user.getUsername()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(
                    Map.of("error", e.getMessage())
            );
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody PasswordResetRequest request, HttpServletRequest servletRequest) {
        try {
            authService.initiatePasswordReset(request.getEmail(), resolveFrontendBaseUrl(servletRequest));
            return ResponseEntity.ok(Map.of(
                    "message", "Password reset email sent. Please check your email."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(
                    Map.of("error", e.getMessage())
            );
        } catch (RuntimeException e) {
            // Don't reveal if email exists or not
            return ResponseEntity.ok(Map.of(
                    "message", "If this email exists, you will receive a password reset link."
            ));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword(), request.getConfirmPassword());
            return ResponseEntity.ok(Map.of(
                    "message", "Password reset successful! You can now login with your new password."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(
                    Map.of("error", e.getMessage())
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(
                    Map.of("error", e.getMessage())
            );
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String[] candidates = forwardedFor.split(",");
            if (candidates.length > 0 && !candidates[0].isBlank()) {
                return candidates[0].trim();
            }
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }
}
