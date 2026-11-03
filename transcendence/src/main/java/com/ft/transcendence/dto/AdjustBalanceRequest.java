package com.ft.transcendence.dto;

import java.math.BigDecimal;

public class AdjustBalanceRequest {
    private BigDecimal delta;

    public BigDecimal getDelta() { return delta; }
    public void setDelta(BigDecimal delta) { this.delta = delta; }
}
