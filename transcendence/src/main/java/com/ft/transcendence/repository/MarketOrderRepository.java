package com.ft.transcendence.repository;

import com.ft.transcendence.model.MarketOrder;
import com.ft.transcendence.model.MarketOrderStatus;
import com.ft.transcendence.model.MarketSide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface MarketOrderRepository extends JpaRepository<MarketOrder, Long> {
        List<MarketOrder> findByMarketIdAndStatusOrderByPriceDescCreatedAtAsc(Long marketId, MarketOrderStatus status);

        List<MarketOrder> findByMarketIdAndStatusAndSideOrderByPriceDescCreatedAtAsc(
                Long marketId,
                MarketOrderStatus status,
                MarketSide side
        );

        @Query("select o from MarketOrder o where o.market.id = :marketId and o.status = :status and o.side = :side and o.price >= :minPrice and o.user.id <> :excludedUserId order by o.price desc, o.createdAt asc")
        List<MarketOrder> findMatchingOrders(
				@Param("marketId") Long marketId,
                @Param("status") MarketOrderStatus status,
                @Param("side") MarketSide side,
                @Param("minPrice") BigDecimal minPrice,
                @Param("excludedUserId") Long excludedUserId
);
        List<MarketOrder> findByUserUsernameOrderByCreatedAtDesc(String username);
        List<MarketOrder> findByMarketIdAndStatus(Long marketId, MarketOrderStatus status);
}