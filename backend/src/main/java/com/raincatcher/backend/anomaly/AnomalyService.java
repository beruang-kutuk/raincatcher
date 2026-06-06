package com.raincatcher.backend.anomaly;

import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.notification.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnomalyService {

    private static final String STATUS_UNRESOLVED = "unresolved";
    private static final String STATUS_RESOLVED = "resolved";

    private final AnomalyRepository repository;
    private final AnomalyEventRepository eventRepository;
    private final AnomalyThresholdService thresholdService;
    private final NotificationService notificationService;

    public AnomalyService(
            AnomalyRepository repository,
            AnomalyEventRepository eventRepository,
            AnomalyThresholdService thresholdService,
            NotificationService notificationService
    ) {
        this.repository = repository;
        this.eventRepository = eventRepository;
        this.thresholdService = thresholdService;
        this.notificationService = notificationService;
    }

    public List<AnomalyEntity> getAnomalies() {
        return repository.findTop100ByOrderByCreatedAtDesc();
    }

    public Map<String, Object> getSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("active", repository.countByStatusNot(STATUS_RESOLVED));
        summary.put("high", repository.countByStatusNotAndSeverity(STATUS_RESOLVED, "high"));
        summary.put("medium", repository.countByStatusNotAndSeverity(STATUS_RESOLVED, "medium"));
        summary.put("low", repository.countByStatusNotAndSeverity(STATUS_RESOLVED, "low"));
        summary.put("recent", repository.findTop100ByStatusNotOrderByCreatedAtDesc(STATUS_RESOLVED).stream().limit(10).toList());
        return summary;
    }

    @Transactional
    public List<AnomalyEntity> evaluateTelemetry(IotTelemetryEntity telemetry) {
        double phLow = thresholdService.getThreshold("ph_min", 6.5, "pH", "Minimum acceptable pH.");
        double phHigh = thresholdService.getThreshold("ph_max", 8.5, "pH", "Maximum acceptable pH.");
        double turbidityHigh = thresholdService.getThreshold("turbidity_high", 100.0, "NTU", "High turbidity threshold.");
        double waterLevelLow = thresholdService.getThreshold("water_level_low", 20.0, "%", "Low water level threshold.");
        double tempLow = thresholdService.getThreshold("water_temperature_low", 10.0, "C", "Low water temperature threshold.");
        double tempHigh = thresholdService.getThreshold("water_temperature_high", 35.0, "C", "High water temperature threshold.");

        if (telemetry.getPh() != null && telemetry.getPh() < phLow) {
            AnomalyEntity anomaly = upsertTelemetryAnomaly(telemetry, "pH Sensor", "ph_sensor", "Low pH detected", "high",
                    String.format("pH is %.2f, below %.2f.", telemetry.getPh(), phLow),
                    String.format("%.2f pH", telemetry.getPh()),
                    "Check water source and pH balance before use.");
            notificationService.createOrUpdateFromAnomaly(anomaly);
        } else if (telemetry.getPh() != null && telemetry.getPh() > phHigh) {
            AnomalyEntity anomaly = upsertTelemetryAnomaly(telemetry, "pH Sensor", "ph_sensor", "High pH detected", "medium",
                    String.format("pH is %.2f, above %.2f.", telemetry.getPh(), phHigh),
                    String.format("%.2f pH", telemetry.getPh()),
                    "Inspect water source. pH is elevated.");
            notificationService.createOrUpdateFromAnomaly(anomaly);
        }

        if (telemetry.getTurbidity() != null && telemetry.getTurbidity() > turbidityHigh) {
            AnomalyEntity anomaly = upsertTelemetryAnomaly(telemetry, "Turbidity Sensor", "turbidity_sensor", "High turbidity detected", "medium",
                    String.format("Turbidity is %.1f NTU, above %.1f NTU.", telemetry.getTurbidity(), turbidityHigh),
                    String.format("%.1f NTU", telemetry.getTurbidity()),
                    "Water clarity is reduced. Inspect tank for sediment.");
            notificationService.createOrUpdateFromAnomaly(anomaly);
        }

        if (telemetry.getWaterLevelPercent() != null && telemetry.getWaterLevelPercent() < waterLevelLow) {
            AnomalyEntity anomaly = upsertTelemetryAnomaly(telemetry, "Ultrasonic Sensor", "ultrasonic_echo", "Low water level", "high",
                    String.format("Water level is %.1f%%, below %.1f%%.", telemetry.getWaterLevelPercent(), waterLevelLow),
                    String.format("%.1f%%", telemetry.getWaterLevelPercent()),
                    "Water level is low. Check supply and usage.");
            notificationService.createOrUpdateFromAnomaly(anomaly);
        }

        if (telemetry.getWaterTemperature() != null && telemetry.getWaterTemperature() < tempLow) {
            AnomalyEntity anomaly = upsertTelemetryAnomaly(telemetry, "Temperature Sensor", "water_temperature_ds18b20", "Low water temperature", "medium",
                    String.format("Water temperature is %.1f C, below %.1f C.", telemetry.getWaterTemperature(), tempLow),
                    String.format("%.1f C", telemetry.getWaterTemperature()),
                    "Water temperature is low. Check sensor placement and weather effects.");
            notificationService.createOrUpdateFromAnomaly(anomaly);
        } else if (telemetry.getWaterTemperature() != null && telemetry.getWaterTemperature() > tempHigh) {
            AnomalyEntity anomaly = upsertTelemetryAnomaly(telemetry, "Temperature Sensor", "water_temperature_ds18b20", "High water temperature", "medium",
                    String.format("Water temperature is %.1f C, above %.1f C.", telemetry.getWaterTemperature(), tempHigh),
                    String.format("%.1f C", telemetry.getWaterTemperature()),
                    "Water temperature is elevated. Monitor water quality.");
            notificationService.createOrUpdateFromAnomaly(anomaly);
        }

        return repository.findTop100ByStatusNotOrderByCreatedAtDesc(STATUS_RESOLVED);
    }

    @Transactional
    public AnomalyEntity createManual(AnomalyEntity anomaly) {
        LocalDateTime now = LocalDateTime.now();
        anomaly.setId(null);
        anomaly.setStatus(emptyToDefault(anomaly.getStatus(), STATUS_UNRESOLVED));
        anomaly.setSeverity(emptyToDefault(anomaly.getSeverity(), "medium"));
        anomaly.setCreatedAt(now);
        anomaly.setUpdatedAt(now);
        AnomalyEntity saved = repository.save(anomaly);
        createEvent(saved, "manual_created", null, saved.getValueText(), "Manual anomaly created.");
        notificationService.createOrUpdateFromAnomaly(saved);
        return saved;
    }

    @Transactional
    public AnomalyEntity update(Long id, AnomalyEntity incoming) {
        AnomalyEntity existing = repository.findById(id).orElseThrow();
        if (incoming.getStatus() != null && !incoming.getStatus().isBlank()) {
            existing.setStatus(incoming.getStatus());
            if (STATUS_RESOLVED.equals(incoming.getStatus()) && existing.getResolvedAt() == null) {
                existing.setResolvedAt(LocalDateTime.now());
            }
        }
        if (incoming.getSeverity() != null && !incoming.getSeverity().isBlank()) {
            existing.setSeverity(incoming.getSeverity());
        }
        if (incoming.getRecommendation() != null) {
            existing.setRecommendation(incoming.getRecommendation());
        }
        existing.setUpdatedAt(LocalDateTime.now());
        AnomalyEntity saved = repository.save(existing);
        createEvent(saved, "updated", saved.getTelemetryId(), saved.getValueText(), "Anomaly updated.");
        notificationService.createOrUpdateFromAnomaly(saved);
        return saved;
    }

    private AnomalyEntity upsertTelemetryAnomaly(
            IotTelemetryEntity telemetry,
            String source,
            String sourceTag,
            String title,
            String severity,
            String description,
            String valueText,
            String recommendation
    ) {
        LocalDateTime now = LocalDateTime.now();
        AnomalyEntity anomaly = repository
                .findFirstByStatusNotAndSourceTagAndTitleOrderByCreatedAtDesc(STATUS_RESOLVED, sourceTag, title)
                .orElseGet(() -> {
                    AnomalyEntity created = new AnomalyEntity();
                    created.setStatus(STATUS_UNRESOLVED);
                    created.setCreatedAt(now);
                    return created;
                });

        anomaly.setTankId(telemetry.getTankId());
        anomaly.setDeviceId(telemetry.getDeviceId());
        anomaly.setTelemetryId(telemetry.getId());
        anomaly.setSource(source);
        anomaly.setSourceTag(sourceTag);
        anomaly.setTitle(title);
        anomaly.setSeverity(severity);
        anomaly.setDescription(description);
        anomaly.setValueText(valueText);
        anomaly.setRecommendation(recommendation);
        anomaly.setUpdatedAt(now);
        AnomalyEntity saved = repository.save(anomaly);
        createEvent(saved, "telemetry_threshold", telemetry.getId(), valueText, description);
        return saved;
    }

    private void createEvent(AnomalyEntity anomaly, String eventType, Long telemetryId, String valueText, String message) {
        AnomalyEventEntity event = new AnomalyEventEntity();
        event.setAnomalyId(anomaly.getId());
        event.setTelemetryId(telemetryId);
        event.setCameraRecordId(anomaly.getCameraRecordId());
        event.setEventType(eventType);
        event.setValueText(valueText);
        event.setMessage(message);
        event.setCreatedAt(LocalDateTime.now());
        eventRepository.save(event);
    }

    private String emptyToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
