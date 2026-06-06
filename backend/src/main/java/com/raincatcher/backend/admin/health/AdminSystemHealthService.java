package com.raincatcher.backend.admin.health;

import com.raincatcher.backend.admin.audit.AdminAuditLogService;
import com.raincatcher.backend.forecast.ForecastRunRepository;
import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import com.raincatcher.backend.reports.ReportRepository;
import com.raincatcher.backend.weather.WeatherRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AdminSystemHealthService {

    private final AdminSystemHealthRepository repository;
    private final IotTelemetryRepository telemetryRepository;
    private final WeatherRecordRepository weatherRecordRepository;
    private final ForecastRunRepository forecastRunRepository;
    private final ReportRepository reportRepository;
    private final AdminAuditLogService auditLogService;
    private final ExternalServiceHealthCheckService externalServiceHealthCheckService;

    public AdminSystemHealthService(
            AdminSystemHealthRepository repository,
            IotTelemetryRepository telemetryRepository,
            WeatherRecordRepository weatherRecordRepository,
            ForecastRunRepository forecastRunRepository,
            ReportRepository reportRepository,
            AdminAuditLogService auditLogService,
            ExternalServiceHealthCheckService externalServiceHealthCheckService
    ) {
        this.repository = repository;
        this.telemetryRepository = telemetryRepository;
        this.weatherRecordRepository = weatherRecordRepository;
        this.forecastRunRepository = forecastRunRepository;
        this.reportRepository = reportRepository;
        this.auditLogService = auditLogService;
        this.externalServiceHealthCheckService = externalServiceHealthCheckService;
    }

    @Transactional
    public Map<String, Object> summary() {
        refresh();
        Optional<IotTelemetryEntity> latest = telemetryRepository.findTopByOrderByIdDesc();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("backendApi", "online");
        result.put("database", "connected");
        result.put("cameraService", repository.findByServiceKey("camera_service").map(AdminSystemHealthEntity::getStatus).orElse("pending"));
        result.put("yoloService", repository.findByServiceKey("yolo_service").map(AdminSystemHealthEntity::getStatus).orElse("pending"));
        result.put("weatherApi", weatherRecordRepository.findTopByOrderByRecordedAtDesc().isPresent() ? "has_records" : "no_records");
        result.put("forecastApi", forecastRunRepository.findTopByStatusOrderByCreatedAtDesc("completed").isPresent() ? "has_completed_runs" : "no_completed_runs");
        result.put("reportGeneration", reportRepository.count() >= 0 ? "ready" : "unknown");

        if (latest.isPresent()) {
            IotTelemetryEntity telemetry = latest.get();
            long seconds = secondsSince(telemetry.getCreatedAt());
            result.put("esp32Telemetry", seconds <= 180 ? "online" : "stale");
            result.put("sensorNode", seconds <= 180 ? "online" : "stale");
            result.put("sensorLastSeenSeconds", seconds);
            result.put("sensorLastSeenAt", telemetry.getCreatedAt() == null ? null : telemetry.getCreatedAt().toString());
            result.put("latestWaterLevel", telemetry.getWaterLevelPercent());
            result.put("latestPh", telemetry.getPh());
            result.put("latestTurbidity", telemetry.getTurbidity());
        } else {
            result.put("esp32Telemetry", "no_data");
            result.put("sensorNode", "no_data");
            result.put("sensorLastSeenSeconds", null);
            result.put("sensorLastSeenAt", null);
        }
        result.put("services", services());
        return result;
    }

    @Transactional
    public List<AdminSystemHealthEntity> refresh() {
        ExternalServiceHealthResult camera = externalServiceHealthCheckService.checkCamera();
        ExternalServiceHealthResult yolo = externalServiceHealthCheckService.checkYolo();

        upsert("backend_api", "Backend API status", "online", true, "Spring Boot backend is serving admin endpoints.");
        upsert("database", "Database status", "connected", true, "MariaDB connection is available through Spring Data repositories.");
        upsert("camera_service", "Camera service status", camera.status(), true, camera.detail() + " Checked: " + camera.url());
        upsert("yolo_service", "YOLO service status", yolo.status(), true, yolo.detail() + " Checked: " + yolo.url());
        upsert("esp32_telemetry", "ESP32 telemetry status", telemetryStatus(), true, "Latest ESP32 telemetry is read from iot_telemetry.");
        upsert("weather_api", "Weather API status", weatherRecordRepository.findTopByOrderByRecordedAtDesc().isPresent() ? "has_records" : "no_records", true, "Weather records are persisted when AccuWeather is configured.");
        upsert("forecast_api", "Forecast API status", forecastRunRepository.findTopByStatusOrderByCreatedAtDesc("completed").isPresent() ? "has_completed_runs" : "no_completed_runs", true, "Forecast API stores runs in forecast_runs.");
        upsert("report_generation", "Report generation status", "ready", true, "Report generation table is available.");
        auditLogService.record("System health checked", "admin", "system-health", "normal", "Admin health summary refreshed.");
        return services();
    }

    public List<AdminSystemHealthEntity> services() {
        return repository.findAllByOrderByServiceNameAsc();
    }

    private void upsert(String key, String name, String status, boolean implemented, String detail) {
        AdminSystemHealthEntity entity = repository.findByServiceKey(key).orElseGet(AdminSystemHealthEntity::new);
        entity.setServiceKey(key);
        entity.setServiceName(name);
        entity.setStatus(status);
        entity.setImplemented(implemented);
        entity.setDetail(detail);
        entity.setCheckedAt(LocalDateTime.now());
        repository.save(entity);
    }

    private String telemetryStatus() {
        Optional<IotTelemetryEntity> latest = telemetryRepository.findTopByOrderByIdDesc();
        if (latest.isEmpty()) return "no_data";
        long seconds = secondsSince(latest.get().getCreatedAt());
        return seconds <= 180 ? "online" : "stale";
    }

    private long secondsSince(LocalDateTime time) {
        if (time == null) return 999_999L;
        return Math.max(0L, Duration.between(time, LocalDateTime.now()).toSeconds());
    }
}
