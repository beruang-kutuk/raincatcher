package com.raincatcher.backend.simulation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_scenarios")
public class SimulationScenarioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String scenarioName;
    private String sourceType;
    private String tankName;
    private Double startingLevelPercent;
    private Double finalLevelPercent;
    private Double lowestLevelPercent;
    private Double highestLevelPercent;
    private Double rainfallMm;
    private Double dailyUsageM3;
    private Double tankCapacityM3;
    private Double collectionEfficiencyPercent;
    private String overflowRisk;
    private String shortageRisk;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    @Column(columnDefinition = "TEXT")
    private String projectionJson;

    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getScenarioName() { return scenarioName; }
    public void setScenarioName(String scenarioName) { this.scenarioName = scenarioName; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public String getTankName() { return tankName; }
    public void setTankName(String tankName) { this.tankName = tankName; }
    public Double getStartingLevelPercent() { return startingLevelPercent; }
    public void setStartingLevelPercent(Double startingLevelPercent) { this.startingLevelPercent = startingLevelPercent; }
    public Double getFinalLevelPercent() { return finalLevelPercent; }
    public void setFinalLevelPercent(Double finalLevelPercent) { this.finalLevelPercent = finalLevelPercent; }
    public Double getLowestLevelPercent() { return lowestLevelPercent; }
    public void setLowestLevelPercent(Double lowestLevelPercent) { this.lowestLevelPercent = lowestLevelPercent; }
    public Double getHighestLevelPercent() { return highestLevelPercent; }
    public void setHighestLevelPercent(Double highestLevelPercent) { this.highestLevelPercent = highestLevelPercent; }
    public Double getRainfallMm() { return rainfallMm; }
    public void setRainfallMm(Double rainfallMm) { this.rainfallMm = rainfallMm; }
    public Double getDailyUsageM3() { return dailyUsageM3; }
    public void setDailyUsageM3(Double dailyUsageM3) { this.dailyUsageM3 = dailyUsageM3; }
    public Double getTankCapacityM3() { return tankCapacityM3; }
    public void setTankCapacityM3(Double tankCapacityM3) { this.tankCapacityM3 = tankCapacityM3; }
    public Double getCollectionEfficiencyPercent() { return collectionEfficiencyPercent; }
    public void setCollectionEfficiencyPercent(Double collectionEfficiencyPercent) { this.collectionEfficiencyPercent = collectionEfficiencyPercent; }
    public String getOverflowRisk() { return overflowRisk; }
    public void setOverflowRisk(String overflowRisk) { this.overflowRisk = overflowRisk; }
    public String getShortageRisk() { return shortageRisk; }
    public void setShortageRisk(String shortageRisk) { this.shortageRisk = shortageRisk; }
    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    public String getProjectionJson() { return projectionJson; }
    public void setProjectionJson(String projectionJson) { this.projectionJson = projectionJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
