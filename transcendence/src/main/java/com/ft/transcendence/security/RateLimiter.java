package com.ft.transcendence.security;

import org.springframework.stereotype.Component;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimiter {

    private static class RateLimit {
        long lastAttempt;
        int attempts;

        RateLimit(long now) {
            this.lastAttempt = now;
            this.attempts = 1;
        }
    }

    private final ConcurrentHashMap<String, RateLimit> loginAttempts = new ConcurrentHashMap<>();
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final long LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

    public boolean isLimited(String identifier) {
        long now = System.currentTimeMillis();
        RateLimit limit = loginAttempts.getOrDefault(identifier, null);

        if (limit == null) {
            return false; // Not limited
        }

        // Check if lock has expired
        if (now - limit.lastAttempt > LOCK_DURATION) {
            loginAttempts.remove(identifier);
            return false; // Not limited
        }

        return limit.attempts >= MAX_LOGIN_ATTEMPTS;
    }

    public void recordAttempt(String identifier) {
        long now = System.currentTimeMillis();
        RateLimit limit = loginAttempts.computeIfAbsent(identifier, key -> new RateLimit(now));

        // Reset if lock expired
        if (now - limit.lastAttempt > LOCK_DURATION) {
            limit.attempts = 1;
            limit.lastAttempt = now;
        } else {
            limit.attempts++;
            limit.lastAttempt = now;
        }
    }

    public void resetAttempts(String identifier) {
        loginAttempts.remove(identifier);
    }

    public long getTimeBeforeRetry(String identifier) {
        RateLimit limit = loginAttempts.get(identifier);
        if (limit == null) {
            return 0;
        }

        long elapsed = System.currentTimeMillis() - limit.lastAttempt;
        long remaining = LOCK_DURATION - elapsed;

        return Math.max(0, remaining / 1000); // Return seconds
    }

    public int getRemainingAttempts(String identifier) {
        RateLimit limit = loginAttempts.get(identifier);
        if (limit == null) {
            return MAX_LOGIN_ATTEMPTS;
        }

        if (System.currentTimeMillis() - limit.lastAttempt > LOCK_DURATION) {
            return MAX_LOGIN_ATTEMPTS;
        }

        return Math.max(0, MAX_LOGIN_ATTEMPTS - limit.attempts);
    }
}
