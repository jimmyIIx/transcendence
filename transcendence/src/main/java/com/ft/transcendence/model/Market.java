package com.ft.transcendence.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "markets")
public class Market {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String question;

    @Column(nullable = false)
    private String category;

    @Column(length = 2000)
    private String description;

    @Column(name = "source_system", nullable = false)
    private String sourceSystem;

    @Column(name = "source_key", nullable = false)
    private String sourceKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(nullable = false)
    private boolean resolved;

    @Column(name = "resolved_outcome")
    private String resolvedOutcome;

    // Objective resolution metadata (null when the market cannot be auto-resolved
    // against 42 data, e.g. project/exam/fallback markets resolved manually).
    @Column(name = "metric_type")
    private String metricType;

    @Column(name = "target_value")
    private Double targetValue;

    @Column(name = "subject_provider_id")
    private String subjectProviderId;

    // Extra context needed to resolve some metrics (e.g. the 42 project name for
    // PROJECT_VALIDATED markets). Null when not applicable.
    @Column(name = "subject_context")
    private String subjectContext;

    @JsonIgnore
    @OneToMany(mappedBy = "market", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("price desc, createdAt asc")
    private List<MarketOrder> orders = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

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

    public String getMetricType() {
        return metricType;
    }

    public void setMetricType(String metricType) {
        this.metricType = metricType;
    }

    public Double getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(Double targetValue) {
        this.targetValue = targetValue;
    }

    public String getSubjectProviderId() {
        return subjectProviderId;
    }

    public void setSubjectProviderId(String subjectProviderId) {
        this.subjectProviderId = subjectProviderId;
    }

    public String getSubjectContext() {
        return subjectContext;
    }

    public void setSubjectContext(String subjectContext) {
        this.subjectContext = subjectContext;
    }

    public List<MarketOrder> getOrders() {
        return orders;
    }

    public void setOrders(List<MarketOrder> orders) {
        this.orders = orders;
    }
}