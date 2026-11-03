package com.ft.transcendence.service;

import com.ft.transcendence.model.JwtBlacklist;
import com.ft.transcendence.repository.JwtBlacklistRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class JwtBlacklistService {
    
    private final JwtBlacklistRepository jwtBlacklistRepository;
    
    public JwtBlacklistService(JwtBlacklistRepository jwtBlacklistRepository) {
        this.jwtBlacklistRepository = jwtBlacklistRepository;
    }
    
    /**
     * Add token to blacklist (invalidate it)
     */
    public void blacklistToken(String token, LocalDateTime expiryDate, String username) {
        JwtBlacklist blacklistedToken = new JwtBlacklist(token, expiryDate, username);
        jwtBlacklistRepository.save(blacklistedToken);
    }
    
    /**
     * Check if token is blacklisted
     */
    public boolean isTokenBlacklisted(String token) {
        return jwtBlacklistRepository.findByToken(token).isPresent();
    }
    
    /**
     * Clean up expired tokens from blacklist (runs daily at 2 AM)
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanUpExpiredTokens() {
        jwtBlacklistRepository.deleteByExpiryDateBefore(LocalDateTime.now());
    }
}
