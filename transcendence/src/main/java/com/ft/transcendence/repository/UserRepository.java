package com.ft.transcendence.repository;

import com.ft.transcendence.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByConfirmationToken(String token);
    Optional<User> findByPasswordResetToken(String token);
    Optional<User> findByOauthProviderAndOauthProviderId(String oauthProvider, String oauthProviderId);
    Optional<User> findByUsernameAndOauthProvider(String username, String oauthProvider);
    java.util.List<User> findByOauthProviderAndMarketGenerationConsentTrue(String oauthProvider);
    List<User> findTop5ByUsernameContainingIgnoreCaseOrderByUsername(String username);
    List<User> findByOauthProvider(String oauthProvider);
}