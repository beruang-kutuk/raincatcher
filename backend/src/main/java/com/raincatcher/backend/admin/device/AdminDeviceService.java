package com.raincatcher.backend.admin.device;

import com.raincatcher.backend.admin.audit.AdminAuditLogService;
import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AdminDeviceService {

    private final AdminDeviceRepository repository;
    private final IotTelemetryRepository telemetryRepository;
    private final AdminAuditLogService auditLogService;

    public AdminDeviceService(
            AdminDeviceRepository repository,
            IotTelemetryRepository telemetryRepository,
            AdminAuditLogService auditLogService
    ) {
        this.repository = repository;
        this.telemetryRepository = telemetryRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public List<AdminDeviceEntity> list() {
        seedDefaults();
        syncTelemetryDevices();
        return repository.findAllByOrderByIdAsc();
    }

    public AdminDeviceEntity get(Long id) {
        return repository.findById(id).orElseThrow();
    }

    @Transactional
    public AdminDeviceEntity create(AdminDeviceRequest request) {
        AdminDeviceEntity entity = new AdminDeviceEntity();
        apply(entity, request);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        AdminDeviceEntity saved = repository.save(entity);
        auditLogService.record("Device created", "admin", saved.getName(), "normal", "Device record created.");
        return saved;
    }

    @Transactional
    public AdminDeviceEntity update(Long id, AdminDeviceRequest request) {
        AdminDeviceEntity entity = repository.findById(id).orElseThrow();
        apply(entity, request);
        entity.setUpdatedAt(LocalDateTime.now());
        AdminDeviceEntity saved = repository.save(entity);
        auditLogService.record("Device updated", "admin", saved.getName(), "normal", "Device record updated.");
        return saved;
    }

    @Transactional
    public AdminDeviceEntity updateStatus(Long id, Map<String, String> request) {
        AdminDeviceEntity entity = repository.findById(id).orElseThrow();
        entity.setStatus(text(request == null ? null : request.get("status"), "Pending"));
        entity.setUpdatedAt(LocalDateTime.now());
        AdminDeviceEntity saved = repository.save(entity);
        auditLogService.record("Device status updated", "admin", saved.getName(), "normal", "Status set to " + saved.getStatus());
        return saved;
    }

    @Transactional
    public AdminDeviceEntity markMaintenance(Long id, Map<String, String> request) {
        AdminDeviceEntity entity = repository.findById(id).orElseThrow();
        entity.setMaintenanceMode(true);
        entity.setStatus("Warning");
        entity.setNotes(text(request == null ? null : request.get("notes"), "Marked for maintenance."));
        entity.setUpdatedAt(LocalDateTime.now());
        AdminDeviceEntity saved = repository.save(entity);
        auditLogService.record("Device maintenance marked", "admin", saved.getName(), "warning", saved.getNotes());
        return saved;
    }

    @Transactional
    public AdminDeviceEntity refresh(Long id) {
        AdminDeviceEntity entity = repository.findById(id).orElseThrow();
        entity.setLastSeen(LocalDateTime.now().toString());
        entity.setLastData("Refresh requested. Hardware-level refresh is not implemented yet.");
        entity.setUpdatedAt(LocalDateTime.now());
        AdminDeviceEntity saved = repository.save(entity);
        auditLogService.record("Device refresh requested", "admin", saved.getName(), "warning", "Not implemented for hardware control.");
        return saved;
    }

    @Transactional
    public AdminDeviceEntity restartService(Long id) {
        AdminDeviceEntity entity = repository.findById(id).orElseThrow();
        entity.setLastData("Restart requested. Service restart command is not implemented yet.");
        entity.setUpdatedAt(LocalDateTime.now());
        AdminDeviceEntity saved = repository.save(entity);
        auditLogService.record("Device service restart requested", "admin", saved.getName(), "warning", "Not implemented for hardware control.");
        return saved;
    }

    private void apply(AdminDeviceEntity entity, AdminDeviceRequest request) {
        if (request == null) return;
        if (hasText(request.name())) entity.setName(request.name().trim());
        if (hasText(request.category())) entity.setCategory(request.category().trim());
        if (hasText(request.status())) entity.setStatus(request.status().trim());
        if (hasText(request.lastSeen())) entity.setLastSeen(request.lastSeen().trim());
        if (hasText(request.lastData())) entity.setLastData(request.lastData().trim());
        if (hasText(request.inputTag())) entity.setInputTag(request.inputTag().trim());
        if (request.maintenanceMode() != null) entity.setMaintenanceMode(request.maintenanceMode());
        if (request.notes() != null) entity.setNotes(request.notes().trim());
        if (!hasText(entity.getStatus())) entity.setStatus("Pending");
        if (entity.getMaintenanceMode() == null) entity.setMaintenanceMode(false);
    }

    private void seedDefaults() {
        if (repository.count() > 0) return;
        createSeed("Raspberry Pi 5 Edge Gateway", "Gateway", "Online", "Live session", "Spring Boot backend reachable", null);
        createSeed("USB Webcam", "Camera", "Pending", "Awaiting camera check", "Camera service proxy configured at :5050/capture", "camera_service");
        createSeed("YOLO Analyzer", "ML Service", "Pending", "Awaiting YOLO check", "YOLO service proxy configured at :5051/analyze-latest", "yolo_service");
        createSeed("ESP32 Sensor Node", "Sensor node", "Offline", "No telemetry received", "Waiting for ESP32 POST to /api/iot/telemetry", "esp32");
        createSeed("pH Sensor", "Water quality", "Pending", "Awaiting telemetry", "Input tag ready", "ph");
        createSeed("Turbidity Sensor", "Water quality", "Pending", "Awaiting telemetry", "Input tag ready", "turbidity");
        createSeed("Ultrasonic Tank Level", "Tank level", "Pending", "Awaiting telemetry", "Input tag ready", "water_level_percent");
        createSeed("DS18B20 Water Temperature", "Water quality", "Pending", "Awaiting telemetry", "Input tag ready", "water_temperature");
    }

    private void createSeed(String name, String category, String status, String lastSeen, String lastData, String inputTag) {
        AdminDeviceEntity entity = new AdminDeviceEntity();
        entity.setName(name);
        entity.setCategory(category);
        entity.setStatus(status);
        entity.setLastSeen(lastSeen);
        entity.setLastData(lastData);
        entity.setInputTag(inputTag);
        entity.setMaintenanceMode(false);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        repository.save(entity);
    }

    private void syncTelemetryDevices() {
        Optional<IotTelemetryEntity> latest = telemetryRepository.findTopByOrderByIdDesc();
        if (latest.isEmpty()) return;
        IotTelemetryEntity telemetry = latest.get();
        long seconds = secondsSince(telemetry.getCreatedAt());
        String status = seconds <= 180 ? "Online" : "Warning";
        String lastSeen = telemetry.getCreatedAt() == null ? "Unknown" : telemetry.getCreatedAt().toString();
        updateTelemetryDevice("esp32", status, lastSeen, "Last packet " + seconds + "s ago");
        updateTelemetryDevice("ph", telemetry.getPh() == null ? "Pending" : status, lastSeen, telemetry.getPh() == null ? "No reading" : round(telemetry.getPh()) + " pH");
        updateTelemetryDevice("turbidity", telemetry.getTurbidity() == null ? "Pending" : status, lastSeen, telemetry.getTurbidity() == null ? "No reading" : round(telemetry.getTurbidity()) + " NTU");
        updateTelemetryDevice("water_level_percent", telemetry.getWaterLevelPercent() == null ? "Pending" : status, lastSeen, telemetry.getWaterLevelPercent() == null ? "No reading" : round(telemetry.getWaterLevelPercent()) + "%");
        updateTelemetryDevice("water_temperature", telemetry.getWaterTemperature() == null ? "Pending" : status, lastSeen, telemetry.getWaterTemperature() == null ? "No reading" : round(telemetry.getWaterTemperature()) + " C");
    }

    private void updateTelemetryDevice(String inputTag, String status, String lastSeen, String lastData) {
        repository.findByInputTag(inputTag).ifPresent((device) -> {
            device.setStatus(status);
            device.setLastSeen(lastSeen);
            device.setLastData(lastData);
            device.setUpdatedAt(LocalDateTime.now());
            repository.save(device);
        });
    }

    private long secondsSince(LocalDateTime time) {
        if (time == null) return 999_999L;
        return Math.max(0L, Duration.between(time, LocalDateTime.now()).toSeconds());
    }

    private String text(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private double round(Double value) {
        return value == null ? 0.0 : Math.round(value * 10.0) / 10.0;
    }
}
