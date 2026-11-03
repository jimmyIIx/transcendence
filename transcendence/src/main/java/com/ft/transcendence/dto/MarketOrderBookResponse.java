package com.ft.transcendence.dto;

import java.util.List;

public class MarketOrderBookResponse {

    private MarketResponse market;
    private List<OrderBookLevel> yesLevels;
    private List<OrderBookLevel> noLevels;

    public MarketResponse getMarket() {
        return market;
    }

    public void setMarket(MarketResponse market) {
        this.market = market;
    }

    public List<OrderBookLevel> getYesLevels() {
        return yesLevels;
    }

    public void setYesLevels(List<OrderBookLevel> yesLevels) {
        this.yesLevels = yesLevels;
    }

    public List<OrderBookLevel> getNoLevels() {
        return noLevels;
    }

    public void setNoLevels(List<OrderBookLevel> noLevels) {
        this.noLevels = noLevels;
    }
}