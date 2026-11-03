package com.ft.transcendence.dto;
import java.math.BigDecimal;

public class LeaderboardEntryResponse {
    private String username;
    private String avatarUrl;
    private BigDecimal pnl;
    private long settledBets;
    private long wonBets;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username;}
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) {this.avatarUrl = avatarUrl;}
    public BigDecimal getPnl() { return pnl; }
    public void setPnl(BigDecimal pnl) { this.pnl = pnl; }
    public long getSettledBets() { return settledBets; }
    public void setSettledBets(long settledBets) { this.settledBets = settledBets; }
    public long getWonBets() { return wonBets; }
    public void setWonBets(long wonBets) { this.wonBets = wonBets; }
}