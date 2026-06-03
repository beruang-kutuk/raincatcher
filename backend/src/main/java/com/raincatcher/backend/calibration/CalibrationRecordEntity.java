package com.raincatcher.backend.calibration;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "calibration_records")
public class CalibrationRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String module;
    private Double predictedValue;
    private Double actualValue;
    private Double errorValue;
    private Double absoluteError;
    private Double accuracyPercent;
    private Double calibrationOffset;
    private Double calibratedValue;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }
    public Double getPredictedValue() { return predictedValue; }
    public void setPredictedValue(Double predictedValue) { this.predictedValue = predictedValue; }
    public Double getActualValue() { return actualValue; }
    public void setActualValue(Double actualValue) { this.actualValue = actualValue; }
    public Double getErrorValue() { return errorValue; }
    public void setErrorValue(Double errorValue) { this.errorValue = errorValue; }
    public Double getAbsoluteError() { return absoluteError; }
    public void setAbsoluteError(Double absoluteError) { this.absoluteError = absoluteError; }
    public Double getAccuracyPercent() { return accuracyPercent; }
    public void setAccuracyPercent(Double accuracyPercent) { this.accuracyPercent = accuracyPercent; }
    public Double getCalibrationOffset() { return calibrationOffset; }
    public void setCalibrationOffset(Double calibrationOffset) { this.calibrationOffset = calibrationOffset; }
    public Double getCalibratedValue() { return calibratedValue; }
    public void setCalibratedValue(Double calibratedValue) { this.calibratedValue = calibratedValue; }
    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
