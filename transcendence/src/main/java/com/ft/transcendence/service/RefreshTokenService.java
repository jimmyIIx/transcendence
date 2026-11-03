package com.ft.transcendence.service;

import com.ft.transcendence.model.RefreshToken;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.RefreshTokenRepository;
import com.ft.transcendence.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private static final long REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60; // 7 days

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, UserRepository userRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    public RefreshToken createRefreshToken(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // Delete existing refresh token by user ID (native query)
        refreshTokenRepository.deleteByUserId(user.getId());

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(Instant.now().plusSeconds(REFRESH_TOKEN_DURATION));

        return refreshTokenRepository.save(refreshToken);
    }

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    public RefreshToken verifyRefreshToken(RefreshToken token) {
        if (token.isExpired()) {
            refreshTokenRepository.deleteByUserId(token.getUser().getId());
            throw new RuntimeException("Le jeton de rafraîchissement a expiré");
        }
        return token;
    }

    public void deleteRefreshToken(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        refreshTokenRepository.deleteByUserId(user.getId());
    }
}
