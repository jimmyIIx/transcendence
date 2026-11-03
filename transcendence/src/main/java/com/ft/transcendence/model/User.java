package com.ft.transcendence.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private boolean emailVerified;

    @JsonIgnore
    private String confirmationToken;

    @JsonIgnore
    private String passwordResetToken;

    @JsonIgnore
    private LocalDateTime passwordResetTokenExpiresAt;

    @JsonIgnore
    private LocalDateTime confirmationTokenExpiresAt;

    @JsonIgnore
    @OneToOne(mappedBy = "user")
    private RefreshToken refreshToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "oauth_provider")
    private String oauthProvider; // source : 42 , github, google 

    @Column(name = "oauth_provider_id")
    private String oauthProviderId;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "market_generation_consent", nullable = false, columnDefinition = "boolean not null default false")
    private boolean marketGenerationConsent = false;

    @Column(name = "market_generation_consent_at")
    private LocalDateTime marketGenerationConsentAt;

    @Column(name = "market_generation_revoked_at")
    private LocalDateTime marketGenerationRevokedAt;

    @Column(name = "oauth_profile_snapshot", columnDefinition = "TEXT")
    private String oauthProfileSnapshot;

    @Column(name = "balance", precision = 15, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "wallet_address", length = 42)
    private String walletAddress;


    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    //getters and setters
    public boolean isOAuthAccount() {
    return oauthProvider != null && oauthProviderId != null;
    }
    
    public String getOauthProvider() {
    return oauthProvider;
    }

    public void setOauthProvider(String oauthProvider) {
        this.oauthProvider = oauthProvider;
    }

    public String getOauthProviderId() {
        return oauthProviderId;
    }

    public void setOauthProviderId(String oauthProviderId) {
        this.oauthProviderId = oauthProviderId;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public boolean isMarketGenerationConsent() {
        return marketGenerationConsent;
    }

    public void setMarketGenerationConsent(boolean marketGenerationConsent) {
        this.marketGenerationConsent = marketGenerationConsent;
    }

    public LocalDateTime getMarketGenerationConsentAt() {
        return marketGenerationConsentAt;
    }

    public void setMarketGenerationConsentAt(LocalDateTime marketGenerationConsentAt) {
        this.marketGenerationConsentAt = marketGenerationConsentAt;
    }

    public LocalDateTime getMarketGenerationRevokedAt() {
        return marketGenerationRevokedAt;
    }

    public void setMarketGenerationRevokedAt(LocalDateTime marketGenerationRevokedAt) {
        this.marketGenerationRevokedAt = marketGenerationRevokedAt;
    }

    public String getOauthProfileSnapshot() {
        return oauthProfileSnapshot;
    }

    public void setOauthProfileSnapshot(String oauthProfileSnapshot) {
        this.oauthProfileSnapshot = oauthProfileSnapshot;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public void addBalance(BigDecimal amount) {
        if (amount == null) return;
        if (this.balance == null) this.balance = BigDecimal.ZERO;
        this.balance = this.balance.add(amount);
    }

    public void subtractBalance(BigDecimal amount) {
        if (amount == null) return;
        if (this.balance == null) this.balance = BigDecimal.ZERO;
        this.balance = this.balance.subtract(amount);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public String getConfirmationToken() {
        return confirmationToken;
    }

    public void setConfirmationToken(String confirmationToken) {
        this.confirmationToken = confirmationToken;
    }

    public String getPasswordResetToken() {
        return passwordResetToken;
    }

    public void setPasswordResetToken(String passwordResetToken) {
        this.passwordResetToken = passwordResetToken;
    }

    public LocalDateTime getPasswordResetTokenExpiresAt() {
        return passwordResetTokenExpiresAt;
    }

    public void setPasswordResetTokenExpiresAt(LocalDateTime passwordResetTokenExpiresAt) {
        this.passwordResetTokenExpiresAt = passwordResetTokenExpiresAt;
    }

    public LocalDateTime getConfirmationTokenExpiresAt() {
        return confirmationTokenExpiresAt;
    }

    public void setConfirmationTokenExpiresAt(LocalDateTime confirmationTokenExpiresAt) {
        this.confirmationTokenExpiresAt = confirmationTokenExpiresAt;
    }

    public RefreshToken getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(RefreshToken refreshToken) {
        this.refreshToken = refreshToken;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}