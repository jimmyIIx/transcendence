package com.ft.transcendence.dto;

public class CreateMarketRequest {

    private String question;
    private String category;
    private String description;
    private String endDate;           // "yyyy-MM-dd'T'HH:mm" from datetime-local input
    private String subjectProviderId; // 42 oauthProviderId of the linked user (optional)
    private String subjectContext;    // optional context for metric resolution (e.g. project name)
    private String metricType;        // LEVEL | CORRECTION_POINT | WALLET | PROJECT_VALIDATED | null
    private Double targetValue;

    public String getQuestion()            { return question; }
    public void setQuestion(String q)      { this.question = q; }

    public String getCategory()            { return category; }
    public void setCategory(String c)      { this.category = c; }

    public String getDescription()         { return description; }
    public void setDescription(String d)   { this.description = d; }

    public String getEndDate()             { return endDate; }
    public void setEndDate(String e)       { this.endDate = e; }

    public String getSubjectProviderId()           { return subjectProviderId; }
    public void setSubjectProviderId(String s)     { this.subjectProviderId = s; }

    public String getSubjectContext()              { return subjectContext; }
    public void setSubjectContext(String c)        { this.subjectContext = c; }

    public String getMetricType()          { return metricType; }
    public void setMetricType(String m)    { this.metricType = m; }

    public Double getTargetValue()         { return targetValue; }
    public void setTargetValue(Double t)   { this.targetValue = t; }
}
