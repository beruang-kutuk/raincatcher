package com.raincatcher.backend.weather;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "weather_records")
public class WeatherRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String location;
    private String recordType;
    private Double temperature;
    private Integer humidity;
    private Double rainfallProbability;
    private Double rainfallAmount;
    private Double windSpeed;
    private String weatherCondition;
    private String source;
    private String providerRecordedAt;
    private LocalDateTime recordedAt;
    private LocalDateTime createdAt;

    @Column(columnDefinition = "TEXT")
    private String rawResponseJson;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getRecordType() {
        return recordType;
    }

    public void setRecordType(String recordType) {
        this.recordType = recordType;
    }

    public Double getTemperature() {
        return temperature;
    }

    public void setTemperature(Double temperature) {
        this.temperature = temperature;
    }

    public Integer getHumidity() {
        return humidity;
    }

    public void setHumidity(Integer humidity) {
        this.humidity = humidity;
    }

    public Double getRainfallProbability() {
        return rainfallProbability;
    }

    public void setRainfallProbability(Double rainfallProbability) {
        this.rainfallProbability = rainfallProbability;
    }

    public Double getRainfallAmount() {
        return rainfallAmount;
    }

    public void setRainfallAmount(Double rainfallAmount) {
        this.rainfallAmount = rainfallAmount;
    }

    public Double getWindSpeed() {
        return windSpeed;
    }

    public void setWindSpeed(Double windSpeed) {
        this.windSpeed = windSpeed;
    }

    public String getWeatherCondition() {
        return weatherCondition;
    }

    public void setWeatherCondition(String weatherCondition) {
        this.weatherCondition = weatherCondition;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getProviderRecordedAt() {
        return providerRecordedAt;
    }

    public void setProviderRecordedAt(String providerRecordedAt) {
        this.providerRecordedAt = providerRecordedAt;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getRawResponseJson() {
        return rawResponseJson;
    }

    public void setRawResponseJson(String rawResponseJson) {
        this.rawResponseJson = rawResponseJson;
    }
}
