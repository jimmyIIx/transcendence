package com.ft.transcendence.service;

import com.ft.transcendence.model.AuditLog;
import com.ft.transcendence.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);
    
    private final AuditLogRepository auditLogRepository;
    
    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }
    
    /**
     * Log an action
     */
    public void logAction(String action, String username, String status) {
        try {
            AuditLog log = new AuditLog(action, username, status);
            auditLogRepository.save(log);
        } catch (Exception e) {
            logger.warn("Failed to log audit trail action={} username={}", action, username, e);
        }
    }
    
    /**
     * Log an action with additional details
     */
    public void logAction(String action, String username, String status, String ipAddress, String details) {
        try {
            AuditLog log = new AuditLog(action, username, status, ipAddress, details);
            auditLogRepository.save(log);
        } catch (Exception e) {
            logger.warn("Failed to log audit trail action={} username={} ip={}", action, username, ipAddress, e);
        }
    }
    
    /**
     * Log login success
     */
    public void logLoginSuccess(String username, String ipAddress) {
        logAction("LOGIN", username, "SUCCESS", ipAddress, "User logged in successfully");
    }
    
    /**
     * Log login failure
     */
    public void logLoginFailure(String username, String ipAddress, String reason) {
        logAction("FAILED_LOGIN", username, "FAILED", ipAddress, reason);
    }
    
    /**
     * Log logout
     */
    public void logLogout(String username, String ipAddress) {
        logAction("LOGOUT", username, "SUCCESS", ipAddress, "User logged out");
    }
    
    /**
     * Log role change
     */
    public void logRoleChange(String username, String newRole, String changedBy, String ipAddress) {
        String details = "Role changed to " + newRole + " by " + changedBy;
        logAction("ROLE_CHANGE", username, "SUCCESS", ipAddress, details);
    }
    
    /**
     * Log registration
     */
    public void logRegistration(String username, String email) {
        logAction("REGISTER", username, "SUCCESS", null, "Email: " + email);
    }
}
