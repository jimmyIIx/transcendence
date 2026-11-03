package com.ft.transcendence.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class MarketResponse {

    private Long id;
    private String question;
    private String category;
    private String description;
    private String sourceSystem;
    private String sourceKey;
    private LocalDateTime createdAt;
    private LocalDateTime endDate;
    private boolean resolved;
    private String resolvedOutcome;
    private BigDecimal yesLiquidity;
    private BigDecimal noLiquidity;
    private BigDecimal yesProbability;
    private long openOrderCount;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSourceSystem() {
        return sourceSystem;
    }

    public void setSourceSystem(String sourceSystem) {
        this.sourceSystem = sourceSystem;
    }

    public String getSourceKey() {
        return sourceKey;
    }

    public void setSourceKey(String sourceKey) {
        this.sourceKey = sourceKey;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }

    public boolean isResolved() {
        return resolved;
    }

    public void setResolved(boolean resolved) {
        this.resolved = resolved;
    }

    public String getResolvedOutcome() {
        return resolvedOutcome;
    }

    public void setResolvedOutcome(String resolvedOutcome) {
        this.resolvedOutcome = resolvedOutcome;
    }

    public BigDecimal getYesLiquidity() {
        return yesLiquidity;
    }

    public void setYesLiquidity(BigDecimal yesLiquidity) {
        this.yesLiquidity = yesLiquidity;
    }

    public BigDecimal getNoLiquidity() {
        return noLiquidity;
    }

    public void setNoLiquidity(BigDecimal noLiquidity) {
        this.noLiquidity = noLiquidity;
    }

    public BigDecimal getYesProbability() {
        return yesProbability;
    }

    public void setYesProbability(BigDecimal yesProbability) {
        this.yesProbability = yesProbability;
    }

    public long getOpenOrderCount() {
        return openOrderCount;
    }

    public void setOpenOrderCount(long openOrderCount) {
        this.openOrderCount = openOrderCount;
    }
}