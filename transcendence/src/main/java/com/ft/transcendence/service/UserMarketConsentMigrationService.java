package com.ft.transcendence.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class UserMarketConsentMigrationService {

    private static final Logger logger = LoggerFactory.getLogger(UserMarketConsentMigrationService.class);

    private final JdbcTemplate jdbcTemplate;

    @Value("${markets.migration.backfill-consent-on-startup:false}")
    private boolean backfillConsentOnStartup;

    public UserMarketConsentMigrationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Order(1)
    @EventListener(ApplicationReadyEvent.class)
    public void backfillMarketGenerationConsent() {
        if (!backfillConsentOnStartup) {
            logger.info("Consent backfill on startup is disabled (markets.migration.backfill-consent-on-startup=false)");
            return;
        }

        try {
            if (!hasRequiredColumns()) {
                logger.warn("Consent backfill skipped: expected consent columns are missing. Use a proper DB migration first.");
                return;
            }

            int updatedRows = jdbcTemplate.update(
                    "UPDATE app_user " +
                            "SET market_generation_consent = (market_generation_consent_at IS NOT NULL AND market_generation_revoked_at IS NULL) " +
                            "WHERE market_generation_consent IS DISTINCT FROM (market_generation_consent_at IS NOT NULL AND market_generation_revoked_at IS NULL)"
            );
            logger.info("Market generation consent backfill completed, {} user rows normalized", updatedRows);
        } catch (Exception exception) {
            logger.warn("Market generation consent backfill failed: {}", exception.getMessage());
        }
    }

    private boolean hasRequiredColumns() {
        return hasColumn("app_user", "market_generation_consent")
                && hasColumn("app_user", "market_generation_consent_at")
                && hasColumn("app_user", "market_generation_revoked_at");
    }

    private boolean hasColumn(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? AND column_name = ?",
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }
}