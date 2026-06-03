package com.raincatcher.backend.iot;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "iot_telemetry")
public class IotTelemetryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id")
    private String deviceId;

    @Column(name = "tank_id")
    private String tankId;

    private Double ph;
    private Double turbidity;

    @Column(name = "water_temperature")
    private Double waterTemperature;

    @Column(name = "ultrasonic_distance_cm")
    private Double ultrasonicDistanceCm;

    @Column(name = "water_level_percent")
    private Double waterLevelPercent;

    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public IotTelemetryEntity() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getTankId() {
        return tankId;
    }

    public void setTankId(String tankId) {
        this.tankId = tankId;
    }

    public Double getPh() {
        return ph;
    }

    public void setPh(Double ph) {
        this.ph = ph;
    }

    public Double getTurbidity() {
        return turbidity;
    }

    public void setTurbidity(Double turbidity) {
        this.turbidity = turbidity;
    }

    public Double getWaterTemperature() {
        return waterTemperature;
    }

    public void setWaterTemperature(Double waterTemperature) {
        this.waterTemperature = waterTemperature;
    }

    public Double getUltrasonicDistanceCm() {
        return ultrasonicDistanceCm;
    }

    public void setUltrasonicDistanceCm(Double ultrasonicDistanceCm) {
        this.ultrasonicDistanceCm = ultrasonicDistanceCm;
    }

    public Double getWaterLevelPercent() {
        return waterLevelPercent;
    }

    public void setWaterLevelPercent(Double waterLevelPercent) {
        this.waterLevelPercent = waterLevelPercent;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
