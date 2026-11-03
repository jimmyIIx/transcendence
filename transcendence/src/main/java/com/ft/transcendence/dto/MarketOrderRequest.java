package com.ft.transcendence.dto;

import com.ft.transcendence.model.MarketSide;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class MarketOrderRequest {

    @NotNull
    private MarketSide side;

    @NotNull
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "100.00")
    private BigDecimal price;

    @NotNull
    @DecimalMin(value = "1.00")
    private BigDecimal amount;

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
}