package com.ft.transcendence.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String action; // LOGIN, FAILED_LOGIN, LOGOUT, ROLE_CHANGE, REGISTER, etc.
    
    @Column(nullable = false)
    private String username;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    private String ipAddress;
    
    private String details; // Additional info
    
    @Column(nullable = false)
    private String status; // SUCCESS, FAILED
    
    public AuditLog() {}
    
    public AuditLog(String action, String username, String status) {
        this.action = action;
        this.username = username;
        this.status = status;
        this.timestamp = LocalDateTime.now();
    }
    
    public AuditLog(String action, String username, String status, String ipAddress, String details) {
        this.action = action;
        this.username = username;
        this.status = status;
        this.ipAddress = ipAddress;
        this.details = details;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getAction() {
        return action;
    }
    
    public void setAction(String action) {
        this.action = action;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public String getIpAddress() {
        return ipAddress;
    }
    
    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
    
    public String getDetails() {
        return details;
    }
    
    public void setDetails(String details) {
        this.details = details;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
}
