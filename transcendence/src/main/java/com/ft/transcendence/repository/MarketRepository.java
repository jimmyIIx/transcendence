package com.ft.transcendence.repository;

import com.ft.transcendence.model.Market;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MarketRepository extends JpaRepository<Market, Long> {
    List<Market> findAllByOrderByResolvedAscCreatedAtDesc();

    List<Market> findBySourceSystemOrderByCreatedAtDesc(String sourceSystem);

    long countBySourceSystemAndResolvedFalse(String sourceSystem);

    @Query("select count(m) from Market m where m.sourceSystem = :sourceSystem and m.resolved = false and (m.sourceKey is null or m.sourceKey not like concat(:fallbackPrefix, '%'))")
    long countBySourceSystemAndResolvedFalseExcludingFallbacks(
            @Param("sourceSystem") String sourceSystem,
            @Param("fallbackPrefix") String fallbackPrefix
    );

    Optional<Market> findBySourceKey(String sourceKey);

    Optional<Market> findBySourceKeyAndResolvedFalse(String sourceKey);

    Optional<Market> findTopBySourceKeyOrderByCreatedAtDesc(String sourceKey);

    List<Market> findByResolvedFalseAndEndDateBefore(LocalDateTime now);

    @Query("SELECT m FROM Market m WHERE LOWER(m.question) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(m.category) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY m.resolved ASC, m.createdAt DESC")
    List<Market> search(@Param("q") String q);

    @Query("SELECT m.category FROM Market m WHERE m.category IS NOT NULL AND m.resolved = false GROUP BY m.category ORDER BY COUNT(m) DESC")
    List<String> findDistinctActiveCategories();
}