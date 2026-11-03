package com.ft.transcendence.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class UserBalanceMigrationService {

    private static final Logger logger = LoggerFactory.getLogger(UserBalanceMigrationService.class);

    private final JdbcTemplate jdbcTemplate;

    public UserBalanceMigrationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void backfillWalletBalances() {
        try {
            int updatedRows = jdbcTemplate.update("UPDATE app_user SET balance = 0 WHERE balance IS NULL");
            jdbcTemplate.execute("ALTER TABLE app_user ALTER COLUMN balance SET DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE app_user ALTER COLUMN balance SET NOT NULL");
            logger.info("Wallet balance migration completed, {} user rows backfilled", updatedRows);
        } catch (Exception exception) {
            logger.warn("Wallet balance migration skipped or failed: {}", exception.getMessage());
        }
    }
}
