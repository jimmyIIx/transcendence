package com.ft.transcendence.dto;

import com.ft.transcendence.model.MarketOrderStatus;
import com.ft.transcendence.model.MarketSide;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class MarketOrderResponse {

    private Long id;
    private Long marketId;
    private String username;
    private MarketSide side;
    private BigDecimal price;
    private BigDecimal amount;
    private MarketOrderStatus status;
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMarketId() {
        return marketId;
    }

    public void setMarketId(Long marketId) {
        this.marketId = marketId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public MarketSide getSide() {
        return side;
    }

    public void setSide(MarketSide side) {
        this.side = side;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public MarketOrderStatus getStatus() {
        return status;
    }

    public void setStatus(MarketOrderStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}