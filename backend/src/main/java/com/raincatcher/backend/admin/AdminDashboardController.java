package com.raincatcher.backend.admin;

import com.raincatcher.backend.admin.audit.AdminAuditLogRepository;
import com.raincatcher.backend.admin.device.AdminDeviceRepository;
import com.raincatcher.backend.admin.forecastsettings.AdminForecastSettingsRepository;
import com.raincatcher.backend.admin.threshold.AdminThresholdRepository;
import com.raincatcher.backend.anomaly.AnomalyRepository;
import com.raincatcher.backend.forecast.ForecastRunRepository;
import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import com.raincatcher.backend.reports.ReportRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

    private final AdminDeviceRepository deviceRepository;
    private final AdminThresholdRepository thresholdRepository;
    private final AdminForecastSettingsRepository forecastSettingsRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final AnomalyRepository anomalyRepository;
    private final ForecastRunRepository forecastRunRepository;
    private final IotTelemetryRepository telemetryRepository;
    private final ReportRepository reportRepository;

    public AdminDashboardController(
            AdminDeviceRepository deviceRepository,
            AdminThresholdRepository thresholdRepository,
            AdminForecastSettingsRepository forecastSettingsRepository,
            AdminAuditLogRepository auditLogRepository,
            AnomalyRepository anomalyRepository,
            ForecastRunRepository forecastRunRepository,
            IotTelemetryRepository telemetryRepository,
            ReportRepository reportRepository
    ) {
        this.deviceRepository = deviceRepository;
        this.thresholdRepository = thresholdRepository;
        this.forecastSettingsRepository = forecastSettingsRepository;
        this.auditLogRepository = auditLogRepository;
        this.anomalyRepository = anomalyRepository;
        this.forecastRunRepository = forecastRunRepository;
        this.telemetryRepository = telemetryRepository;
        this.reportRepository = reportRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        Optional<IotTelemetryEntity> latest = telemetryRepository.findTopByOrderByIdDesc();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("onlineDevices", deviceRepository.findAll().stream().filter((device) -> "Online".equalsIgnoreCase(device.getStatus())).count());
        result.put("totalDevices", deviceRepository.count());
        result.put("thresholdRules", thresholdRepository.count());
        result.put("forecastDefaults", forecastSettingsRepository.count());
        result.put("auditEvents", auditLogRepository.count());
        result.put("currentAlerts", anomalyRepository.count());
        result.put("forecastRuns", forecastRunRepository.count());
        result.put("reportRecords", reportRepository.count());
        if (latest.isPresent()) {
            IotTelemetryEntity telemetry = latest.get();
            long seconds = secondsSince(telemetry.getCreatedAt());
            result.put("sensorStatus", seconds <= 180 ? "online" : "stale");
            result.put("sensorLastSeenSeconds", seconds);
            result.put("waterLevelPercent", telemetry.getWaterLevelPercent());
            result.put("ph", telemetry.getPh());
            result.put("turbidity", telemetry.getTurbidity());
        } else {
            result.put("sensorStatus", "no_data");
        }
        return ResponseEntity.ok(result);
    }

    private long secondsSince(LocalDateTime time) {
        if (time == null) return 999_999L;
        return Math.max(0L, Duration.between(time, LocalDateTime.now()).toSeconds());
    }
}
