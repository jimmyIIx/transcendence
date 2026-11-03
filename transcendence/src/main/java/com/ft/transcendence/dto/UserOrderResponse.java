package com.ft.transcendence.dto;

import com.ft.transcendence.model.MarketOrderStatus;
import com.ft.transcendence.model.MarketSide;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class UserOrderResponse {

    private Long id;
    private Long marketId;
    private String marketQuestion;
    private String marketCategory;
    private MarketSide side;
    private BigDecimal price;
    private BigDecimal amount;
    private BigDecimal filledAmount;
    private MarketOrderStatus status;
    private LocalDateTime createdAt;
    private boolean marketResolved;
    private String marketResolvedOutcome;
    private LocalDateTime marketEndDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMarketId() { return marketId; }
    public void setMarketId(Long marketId) { this.marketId = marketId; }

    public String getMarketQuestion() { return marketQuestion; }
    public void setMarketQuestion(String marketQuestion) { this.marketQuestion = marketQuestion; }

    public String getMarketCategory() { return marketCategory; }
    public void setMarketCategory(String marketCategory) { this.marketCategory = marketCategory; }

    public MarketSide getSide() { return side; }
    public void setSide(MarketSide side) { this.side = side; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getFilledAmount() { return filledAmount; }
    public void setFilledAmount(BigDecimal filledAmount) { this.filledAmount = filledAmount; }

    public MarketOrderStatus getStatus() { return status; }
    public void setStatus(MarketOrderStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isMarketResolved() { return marketResolved; }
    public void setMarketResolved(boolean marketResolved) { this.marketResolved = marketResolved; }

    public String getMarketResolvedOutcome() { return marketResolvedOutcome; }
    public void setMarketResolvedOutcome(String marketResolvedOutcome) { this.marketResolvedOutcome = marketResolvedOutcome; }

    public LocalDateTime getMarketEndDate() { return marketEndDate; }
    public void setMarketEndDate(LocalDateTime marketEndDate) { this.marketEndDate = marketEndDate; }
}
