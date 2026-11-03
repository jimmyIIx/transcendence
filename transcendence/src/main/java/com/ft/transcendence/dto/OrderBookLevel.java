package com.ft.transcendence.dto;

import java.math.BigDecimal;

public class OrderBookLevel {

    private BigDecimal price;
    private BigDecimal amount;
    private long orderCount;

    public OrderBookLevel() {
    }

    public OrderBookLevel(BigDecimal price, BigDecimal amount, long orderCount) {
        this.price = price;
        this.amount = amount;
        this.orderCount = orderCount;
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

    public long getOrderCount() {
        return orderCount;
    }

    public void setOrderCount(long orderCount) {
        this.orderCount = orderCount;
    }
}