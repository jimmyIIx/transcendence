package com.ft.transcendence.service;

import com.ft.transcendence.dto.*;
import com.ft.transcendence.model.*;
import com.ft.transcendence.repository.MarketOrderRepository;
import com.ft.transcendence.repository.MarketRepository;
import com.ft.transcendence.repository.TradeRepository;
import com.ft.transcendence.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MarketService {

    private final MarketRepository marketRepository;
    private final MarketOrderRepository marketOrderRepository;
    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final NotificationService notificationService;

    public MarketService(
            MarketRepository marketRepository,
            MarketOrderRepository marketOrderRepository,
            UserRepository userRepository,
            TradeRepository tradeRepository,
            NotificationService notificationService
    ) {
        this.marketRepository = marketRepository;
        this.marketOrderRepository = marketOrderRepository;
        this.userRepository = userRepository;
        this.tradeRepository = tradeRepository;
        this.notificationService = notificationService;
    }

    public List<MarketResponse> getMarkets() {
        return marketRepository.findAllByOrderByResolvedAscCreatedAtDesc().stream()
                .map(this::toMarketResponse)
                .collect(Collectors.toList());
    }

    public MarketResponse getMarket(Long marketId) {
        return toMarketResponse(requireMarket(marketId));
    }

    public MarketOrderBookResponse getOrderBook(Long marketId) {
        Market market = requireMarket(marketId);
        List<MarketOrder> openOrders = marketOrderRepository.findByMarketIdAndStatusOrderByPriceDescCreatedAtAsc(
                marketId,
                MarketOrderStatus.OPEN
        );

        MarketOrderBookResponse response = new MarketOrderBookResponse();
        response.setMarket(toMarketResponse(market));
        response.setYesLevels(aggregateLevels(openOrders, MarketSide.YES));
        response.setNoLevels(aggregateLevels(openOrders, MarketSide.NO));
        return response;
    }

    @Transactional
    public MarketOrderResponse placeOrder(Long marketId, Principal principal, MarketOrderRequest request) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }

        Market market = requireMarket(marketId);
        if (market.isResolved()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Marché déjà résolu");
        }
        if (market.getEndDate() != null && market.getEndDate().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le marché a expiré");
        }

        User user = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        BigDecimal normalizedPrice = normalizePrice(request.getPrice());
        BigDecimal normalizedAmount = normalizeAmount(request.getAmount());

        // Debit the stake from the user's balance (price * amount / 100)
        BigDecimal stake = normalizedPrice.multiply(normalizedAmount)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (user.getBalance().compareTo(stake) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solde insuffisant");
        }
        user.subtractBalance(stake);
        userRepository.save(user);

        MarketOrder order = new MarketOrder();
        order.setMarket(market);
        order.setUser(user);
        order.setSide(request.getSide());
        order.setPrice(normalizedPrice);
        order.setAmount(normalizedAmount);
        order.setOriginalAmount(normalizedAmount);
        order.setFilledAmount(BigDecimal.ZERO);
        order.setStatus(MarketOrderStatus.OPEN);

        MarketOrder saved = marketOrderRepository.save(order);

        // Order book matching: YES@P matches NO@Q when P + Q >= 100
        BigDecimal onehundred = BigDecimal.valueOf(100);
        MarketSide opposingSide = saved.getSide() == MarketSide.YES ? MarketSide.NO : MarketSide.YES;
        BigDecimal minOpposingPrice = onehundred.subtract(saved.getPrice()).setScale(2, RoundingMode.HALF_UP);

        List<MarketOrder> matches = marketOrderRepository.findMatchingOrders(marketId, MarketOrderStatus.OPEN, opposingSide, minOpposingPrice, user.getId());
        BigDecimal remaining = saved.getAmount();
        List<MarketOrder> toUpdate = new ArrayList<>();
        List<Trade> tradesToSave = new ArrayList<>();

        for (MarketOrder match : matches) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal fillAmount = remaining.min(match.getAmount());

            // Record the trade for audit
            Trade trade = new Trade();
            trade.setMarket(market);
            trade.setMakerOrder(match);
            trade.setTakerOrder(saved);
            trade.setAmount(fillAmount);
            tradesToSave.add(trade);

            // Update matched order's filled/remaining amounts
            match.setFilledAmount(match.getFilledAmount().add(fillAmount));
            match.setAmount(match.getAmount().subtract(fillAmount));
            if (match.getAmount().compareTo(BigDecimal.ZERO) == 0) {
                match.setStatus(MarketOrderStatus.FILLED);
            }
            toUpdate.add(match);

            // Update taker's filled amount
            saved.setFilledAmount(saved.getFilledAmount().add(fillAmount));
            remaining = remaining.subtract(fillAmount);
        }

        saved.setAmount(remaining);
        if (remaining.compareTo(BigDecimal.ZERO) == 0) {
            saved.setStatus(MarketOrderStatus.FILLED);
        }
        if (!toUpdate.isEmpty()) {
            marketOrderRepository.saveAll(toUpdate);
        }
        if (!tradesToSave.isEmpty()) {
            tradeRepository.saveAll(tradesToSave);
        }

        // Notify after commit (transactionally safe)
        if (saved.getFilledAmount().compareTo(BigDecimal.ZERO) > 0) {
            final String takerName   = user.getUsername();
            final String question    = market.getQuestion();
            final long   mktId       = market.getId();
            final List<String> makerNames = toUpdate.stream()
                    .map(m -> m.getUser().getUsername())
                    .distinct()
                    .collect(Collectors.toList());

            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    Map<String, Object> extra = Map.of("marketId", mktId, "marketQuestion", question);
                    String msg = "Votre ordre sur \"" + truncate(question, 45) + "\" a été exécuté";
                    notificationService.notifyUser(takerName, "ORDER_FILLED", msg, extra);
                    for (String maker : makerNames) {
                        notificationService.notifyUser(maker, "ORDER_FILLED", msg, extra);
                    }
                }
            });
        }

        return toOrderResponse(marketOrderRepository.save(saved));
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getLeaderboard() {
        Map<Long, LeaderboardEntryResponse> byUser = new HashMap<>();

        for (MarketOrder order : marketOrderRepository.findAll()) {
            if (order.getMarket() == null || !order.getMarket().isResolved()) continue;
            if (order.getStatus() == MarketOrderStatus.CANCELLED) continue;
            if (order.getUser() == null) continue;

            User user = order.getUser();
            LeaderboardEntryResponse entry = byUser.computeIfAbsent(user.getId(), id -> {
                LeaderboardEntryResponse e = new LeaderboardEntryResponse();
                e.setUsername(user.getUsername());
                e.setAvatarUrl(user.getAvatarUrl());
                e.setPnl(BigDecimal.ZERO);
                e.setSettledBets(0);
                e.setWonBets(0);
                return e;
            });

            BigDecimal shares = normalizeAmount(order.getFilledAmount().add(order.getAmount()));
            boolean won = order.getMarket().getResolvedOutcome() != null
                    && order.getMarket().getResolvedOutcome().equals(order.getSide().name());

            BigDecimal gain = won ? shares : BigDecimal.ZERO;
            BigDecimal spent = normalizePrice(order.getPrice())
                    .multiply(shares)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            if (won) {
                entry.setWonBets(entry.getWonBets() + 1);
            }

            entry.setPnl(entry.getPnl().add(gain.subtract(spent)));
            entry.setSettledBets(entry.getSettledBets() + 1);
        }

        return byUser.values().stream()
                .sorted(
                        Comparator.comparing(LeaderboardEntryResponse::getPnl).reversed()
                                .thenComparing(LeaderboardEntryResponse::getWonBets, Comparator.reverseOrder())
                                .thenComparing(LeaderboardEntryResponse::getUsername, String.CASE_INSENSITIVE_ORDER)
                )
                .collect(Collectors.toList());
    }

    public List<UserOrderResponse> getMyOrders(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }
        return marketOrderRepository.findByUserUsernameOrderByCreatedAtDesc(principal.getName())
                .stream()
                .map(this::toUserOrderResponse)
                .collect(Collectors.toList());
    }

    private UserOrderResponse toUserOrderResponse(MarketOrder order) {
        Market market = order.getMarket();
        UserOrderResponse r = new UserOrderResponse();
        r.setId(order.getId());
        r.setMarketId(market.getId());
        r.setMarketQuestion(market.getQuestion());
        r.setMarketCategory(market.getCategory());
        r.setSide(order.getSide());
        r.setPrice(order.getPrice());
        r.setAmount(order.getAmount());
        r.setFilledAmount(order.getFilledAmount());
        r.setStatus(order.getStatus());
        r.setCreatedAt(order.getCreatedAt());
        r.setMarketResolved(market.isResolved());
        r.setMarketResolvedOutcome(market.getResolvedOutcome());
        r.setMarketEndDate(market.getEndDate());
        return r;
    }

    @Transactional
    public MarketResponse resolveMarket(Long marketId, String outcome) {
        if (!"YES".equals(outcome) && !"NO".equals(outcome)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Outcome must be YES or NO");
        }
        Market market = requireMarket(marketId);
        if (market.isResolved()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Marché déjà résolu");
        }
        market.setResolved(true);
        market.setResolvedOutcome(outcome);
        marketRepository.save(market);

        MarketSide winningSide = MarketSide.valueOf(outcome);
        Map<Long, User> usersToSave = new HashMap<>();

        // Process OPEN orders (including partially filled): refund remaining stake + pay winner on filled part
        List<MarketOrder> openOrders = marketOrderRepository.findByMarketIdAndStatusOrderByPriceDescCreatedAtAsc(
                marketId, MarketOrderStatus.OPEN);

        for (MarketOrder order : openOrders) {
            User u = usersToSave.computeIfAbsent(order.getUser().getId(), id -> order.getUser());

            // Refund the stake on the unfilled remaining amount
            BigDecimal refund = order.getPrice().multiply(order.getAmount())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            u.addBalance(refund);

            // Pay winnings on the filled portion if this side won
            if (order.getSide() == winningSide && order.getFilledAmount().compareTo(BigDecimal.ZERO) > 0) {
                u.addBalance(order.getFilledAmount());
            }

            order.setStatus(MarketOrderStatus.CANCELLED);
        }

        // Process FILLED orders: pay winners (filledAmount = originalAmount for fully filled orders)
        List<MarketOrder> filledOrders = marketOrderRepository.findByMarketIdAndStatus(
                marketId, MarketOrderStatus.FILLED);

        for (MarketOrder order : filledOrders) {
            if (order.getSide() == winningSide) {
                User u = usersToSave.computeIfAbsent(order.getUser().getId(), id -> order.getUser());
                u.addBalance(order.getFilledAmount());
            }
        }

        userRepository.saveAll(usersToSave.values());
        marketOrderRepository.saveAll(openOrders);

        // Notify all affected users after commit
        final Set<String> affected = new HashSet<>();
        openOrders.forEach(o -> affected.add(o.getUser().getUsername()));
        filledOrders.forEach(o -> affected.add(o.getUser().getUsername()));
        final String question = market.getQuestion();
        final long   mktId    = market.getId();
        final String outcomeFinal = outcome;

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                Map<String, Object> extra = Map.of(
                        "marketId", mktId,
                        "marketQuestion", question,
                        "outcome", outcomeFinal);
                String msg = "Le marché \"" + truncate(question, 45) + "\" a été résolu : " + outcomeFinal;
                notificationService.notifyUsers(affected, "MARKET_RESOLVED", msg, extra);
            }
        });

        return toMarketResponse(market);
    }

    @Transactional
    public void deleteMarket(Long marketId) {
        Market market = requireMarket(marketId);
        if (!market.isResolved()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seuls les marchés résolus peuvent être supprimés");
        }
        marketRepository.delete(market);
    }

    private Market requireMarket(Long marketId) {
        return marketRepository.findById(marketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Marché introuvable"));
    }

    public List<String> getDistinctCategories() {
        return marketRepository.findDistinctActiveCategories();
    }

    public List<MarketResponse> searchMarkets(String query) {
        return marketRepository.search(query).stream()
                .limit(5)
                .map(this::toMarketResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public MarketResponse createMarket(com.ft.transcendence.dto.CreateMarketRequest request) {
        if (request.getQuestion() == null || request.getQuestion().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La question est obligatoire");
        }
        if (request.getCategory() == null || request.getCategory().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La catégorie est obligatoire");
        }

        Market market = new Market();
        market.setQuestion(request.getQuestion().trim());
        market.setCategory(request.getCategory().trim().toUpperCase());
        market.setDescription(request.getDescription());
        market.setSourceSystem("admin");
        market.setSourceKey("admin-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        market.setResolved(false);

        if (request.getEndDate() != null && !request.getEndDate().isBlank()) {
            try {
                String raw = request.getEndDate().trim();
                market.setEndDate(raw.length() == 16
                        ? LocalDateTime.parse(raw, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"))
                        : LocalDateTime.parse(raw));
            } catch (Exception exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Format de endDate invalide. Format attendu: yyyy-MM-dd'T'HH:mm", exception);
            }
        }

        if (request.getSubjectProviderId() != null && !request.getSubjectProviderId().isBlank()) {
            market.setSubjectProviderId(request.getSubjectProviderId().trim());
        }

        if (request.getSubjectContext() != null && !request.getSubjectContext().isBlank()) {
            market.setSubjectContext(request.getSubjectContext().trim());
        }

        String metricType = request.getMetricType();
        if ((metricType == null || metricType.isBlank()) && "PROJECT".equals(market.getCategory())) {
            metricType = FortyTwoProfileMetrics.METRIC_PROJECT_VALIDATED;
        }

        if (metricType != null && !metricType.isBlank()) {
            metricType = metricType.trim();
            if (FortyTwoProfileMetrics.METRIC_PROJECT_VALIDATED.equals(metricType)) {
                if (market.getSubjectProviderId() == null || market.getSubjectProviderId().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "subjectProviderId est obligatoire pour PROJECT_VALIDATED");
                }
                if (market.getSubjectContext() == null || market.getSubjectContext().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "subjectContext (nom du projet) est obligatoire pour PROJECT_VALIDATED");
                }
            }

            market.setMetricType(metricType);
        market.setTargetValue(
            FortyTwoProfileMetrics.METRIC_PROJECT_VALIDATED.equals(metricType)
                ? (request.getTargetValue() != null ? request.getTargetValue() : 1.0)
                : request.getTargetValue()
        );
        }

        return toMarketResponse(marketRepository.save(market));
    }

    private String truncate(String s, int max) {
        if (s == null || s.length() <= max) return s;
        return s.substring(0, max) + "...";
    }

    private MarketResponse toMarketResponse(Market market) {
        List<MarketOrder> openOrders = marketOrderRepository.findByMarketIdAndStatusOrderByPriceDescCreatedAtAsc(
                market.getId(),
                MarketOrderStatus.OPEN
        );

        BigDecimal yesLiquidity = sumAmount(openOrders, MarketSide.YES);
        BigDecimal noLiquidity = sumAmount(openOrders, MarketSide.NO);
        BigDecimal totalLiquidity = yesLiquidity.add(noLiquidity);
        BigDecimal yesProbability = totalLiquidity.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : yesLiquidity.multiply(BigDecimal.valueOf(100)).divide(totalLiquidity, 2, RoundingMode.HALF_UP);

        MarketResponse response = new MarketResponse();
        response.setId(market.getId());
        response.setQuestion(market.getQuestion());
        response.setCategory(market.getCategory());
        response.setDescription(market.getDescription());
        response.setSourceSystem(market.getSourceSystem());
        response.setSourceKey(market.getSourceKey());
        response.setCreatedAt(market.getCreatedAt());
        response.setEndDate(market.getEndDate());
        response.setResolved(market.isResolved());
        response.setResolvedOutcome(market.getResolvedOutcome());
        response.setYesLiquidity(yesLiquidity);
        response.setNoLiquidity(noLiquidity);
        response.setYesProbability(yesProbability);
        response.setOpenOrderCount(openOrders.size());
        return response;
    }

    private List<OrderBookLevel> aggregateLevels(List<MarketOrder> orders, MarketSide side) {
        Map<BigDecimal, LevelAccumulator> grouped = new TreeMap<>(Comparator.reverseOrder());

        for (MarketOrder order : orders) {
            if (order.getSide() != side) {
                continue;
            }

            BigDecimal price = normalizePrice(order.getPrice());
            LevelAccumulator accumulator = grouped.computeIfAbsent(price, key -> new LevelAccumulator());
            accumulator.amount = accumulator.amount.add(normalizeAmount(order.getAmount()));
            accumulator.orderCount++;
        }

        List<OrderBookLevel> levels = new ArrayList<>();
        for (Map.Entry<BigDecimal, LevelAccumulator> entry : grouped.entrySet()) {
            levels.add(new OrderBookLevel(entry.getKey(), entry.getValue().amount, entry.getValue().orderCount));
        }
        return levels;
    }

    private BigDecimal sumAmount(List<MarketOrder> orders, MarketSide side) {
        BigDecimal total = BigDecimal.ZERO;
        for (MarketOrder order : orders) {
            if (order.getSide() == side) {
                total = total.add(normalizeAmount(order.getAmount()));
            }
        }
        return total;
    }

    private BigDecimal normalizePrice(BigDecimal price) {
        return price.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private MarketOrderResponse toOrderResponse(MarketOrder order) {
        MarketOrderResponse response = new MarketOrderResponse();
        response.setId(order.getId());
        response.setMarketId(order.getMarket().getId());
        response.setUsername(order.getUser().getUsername());
        response.setSide(order.getSide());
        response.setPrice(order.getPrice());
        response.setAmount(order.getAmount());
        response.setStatus(order.getStatus());
        response.setCreatedAt(order.getCreatedAt());
        return response;
    }

    private static class LevelAccumulator {
        BigDecimal amount = BigDecimal.ZERO;
        int orderCount = 0;
    }
}
