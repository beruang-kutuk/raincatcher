package com.raincatcher.backend.camera;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "camera_records")
public class CameraRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tankId;
    private String cameraSource;
    private String recordType;
    private String imageUrl;
    private String yoloFrameUrl;
    private String status;
    private String severity;
    private Double brightness;
    private Double blurScore;
    private Double darkRatio;
    private Double brightRatio;
    private String visualStatus;
    private String yoloModel;
    private Integer detectionCount;

    @Column(columnDefinition = "TEXT")
    private String detectionsJson;

    @Column(columnDefinition = "TEXT")
    private String aiRecommendation;

    @Column(columnDefinition = "TEXT")
    private String futureNote;

    private LocalDateTime createdAt;

    public CameraRecordEntity() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTankId() {
        return tankId;
    }

    public void setTankId(String tankId) {
        this.tankId = tankId;
    }

    public String getCameraSource() {
        return cameraSource;
    }

    public void setCameraSource(String cameraSource) {
        this.cameraSource = cameraSource;
    }

    public String getRecordType() {
        return recordType;
    }

    public void setRecordType(String recordType) {
        this.recordType = recordType;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getYoloFrameUrl() {
        return yoloFrameUrl;
    }

    public void setYoloFrameUrl(String yoloFrameUrl) {
        this.yoloFrameUrl = yoloFrameUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public Double getBrightness() {
        return brightness;
    }

    public void setBrightness(Double brightness) {
        this.brightness = brightness;
    }

    public Double getBlurScore() {
        return blurScore;
    }

    public void setBlurScore(Double blurScore) {
        this.blurScore = blurScore;
    }

    public Double getDarkRatio() {
        return darkRatio;
    }

    public void setDarkRatio(Double darkRatio) {
        this.darkRatio = darkRatio;
    }

    public Double getBrightRatio() {
        return brightRatio;
    }

    public void setBrightRatio(Double brightRatio) {
        this.brightRatio = brightRatio;
    }

    public String getVisualStatus() {
        return visualStatus;
    }

    public void setVisualStatus(String visualStatus) {
        this.visualStatus = visualStatus;
    }

    public String getYoloModel() {
        return yoloModel;
    }

    public void setYoloModel(String yoloModel) {
        this.yoloModel = yoloModel;
    }

    public Integer getDetectionCount() {
        return detectionCount;
    }

    public void setDetectionCount(Integer detectionCount) {
        this.detectionCount = detectionCount;
    }

    public String getDetectionsJson() {
        return detectionsJson;
    }

    public void setDetectionsJson(String detectionsJson) {
        this.detectionsJson = detectionsJson;
    }

    public String getAiRecommendation() {
        return aiRecommendation;
    }

    public void setAiRecommendation(String aiRecommendation) {
        this.aiRecommendation = aiRecommendation;
    }

    public String getFutureNote() {
        return futureNote;
    }

    public void setFutureNote(String futureNote) {
        this.futureNote = futureNote;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
