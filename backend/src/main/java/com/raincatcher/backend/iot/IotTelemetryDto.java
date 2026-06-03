package com.raincatcher.backend.iot;

import com.fasterxml.jackson.annotation.JsonProperty;

public class IotTelemetryDto {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("deviceId")
    private String deviceId;

    @JsonProperty("tankId")
    private String tankId;

    @JsonProperty("ph")
    private Double ph;

    @JsonProperty("turbidity")
    private Double turbidity;

    @JsonProperty("waterTemperature")
    private Double waterTemperature;

    @JsonProperty("ultrasonicDistanceCm")
    private Double ultrasonicDistanceCm;

    @JsonProperty("waterLevelPercent")
    private Double waterLevelPercent;

    @JsonProperty("timestamp")
    private String timestamp;

    @JsonProperty("createdAt")
    private String createdAt;

    @JsonProperty("status")
    private String status;

    public IotTelemetryDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getTankId() { return tankId; }
    public void setTankId(String tankId) { this.tankId = tankId; }

    public Double getPh() { return ph; }
    public void setPh(Double ph) { this.ph = ph; }

    public Double getTurbidity() { return turbidity; }
    public void setTurbidity(Double turbidity) { this.turbidity = turbidity; }

    public Double getWaterTemperature() { return waterTemperature; }
    public void setWaterTemperature(Double waterTemperature) { this.waterTemperature = waterTemperature; }

    public Double getUltrasonicDistanceCm() { return ultrasonicDistanceCm; }
    public void setUltrasonicDistanceCm(Double ultrasonicDistanceCm) { this.ultrasonicDistanceCm = ultrasonicDistanceCm; }

    public Double getWaterLevelPercent() { return waterLevelPercent; }
    public void setWaterLevelPercent(Double waterLevelPercent) { this.waterLevelPercent = waterLevelPercent; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
