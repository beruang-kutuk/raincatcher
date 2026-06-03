package com.raincatcher.backend.iot;

import com.raincatcher.backend.anomaly.AnomalyService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class IotTelemetryService {

    private final IotTelemetryRepository repository;
    private final AnomalyService anomalyService;

    public IotTelemetryService(IotTelemetryRepository repository, AnomalyService anomalyService) {
        this.repository = repository;
        this.anomalyService = anomalyService;
    }

    @Transactional
    public IotTelemetryDto save(IotTelemetryDto reading) {
        IotTelemetryEntity entity = new IotTelemetryEntity();
        entity.setDeviceId(reading.getDeviceId());
        entity.setTankId(reading.getTankId());
        entity.setPh(reading.getPh());
        entity.setTurbidity(reading.getTurbidity());
        entity.setWaterTemperature(reading.getWaterTemperature());
        entity.setUltrasonicDistanceCm(reading.getUltrasonicDistanceCm());
        entity.setWaterLevelPercent(reading.getWaterLevelPercent());
        entity.setStatus("received");
        entity.setCreatedAt(LocalDateTime.now());

        IotTelemetryEntity saved = repository.save(entity);
        anomalyService.evaluateTelemetry(saved);
        return toDto(saved);
    }

    public IotTelemetryDto getLatest() {
        return repository.findTopByOrderByIdDesc()
                .map(this::toDto)
                .orElse(null);
    }

    public List<IotTelemetryDto> getHistory() {
        return repository.findTop50ByOrderByIdDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        IotTelemetryEntity latest = repository.findTopByOrderByIdDesc().orElse(null);
        if (latest == null || latest.getCreatedAt() == null) {
            status.put("deviceId", null);
            status.put("lastSeen", null);
            status.put("status", "OFFLINE");
            status.put("secondsSinceLastReading", null);
            return status;
        }

        long seconds = Math.max(0L, Duration.between(latest.getCreatedAt(), LocalDateTime.now()).toSeconds());
        String deviceStatus = seconds <= 120 ? "ONLINE" : "STALE";
        status.put("deviceId", latest.getDeviceId());
        status.put("lastSeen", latest.getCreatedAt().toString());
        status.put("status", deviceStatus);
        status.put("secondsSinceLastReading", seconds);
        return status;
    }

    private IotTelemetryDto toDto(IotTelemetryEntity entity) {
        IotTelemetryDto dto = new IotTelemetryDto();
        String createdAt = entity.getCreatedAt() == null ? null : entity.getCreatedAt().toString();
        dto.setId(entity.getId());
        dto.setDeviceId(entity.getDeviceId());
        dto.setTankId(entity.getTankId());
        dto.setPh(entity.getPh());
        dto.setTurbidity(entity.getTurbidity());
        dto.setWaterTemperature(entity.getWaterTemperature());
        dto.setUltrasonicDistanceCm(entity.getUltrasonicDistanceCm());
        dto.setWaterLevelPercent(entity.getWaterLevelPercent());
        dto.setStatus(entity.getStatus());
        dto.setCreatedAt(createdAt);
        dto.setTimestamp(createdAt);
        return dto;
    }
}
