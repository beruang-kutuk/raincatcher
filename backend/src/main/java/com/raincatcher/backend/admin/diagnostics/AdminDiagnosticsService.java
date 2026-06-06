package com.raincatcher.backend.admin.diagnostics;

import com.raincatcher.backend.admin.audit.AdminAuditLogService;
import com.raincatcher.backend.admin.health.ExternalServiceHealthCheckService;
import com.raincatcher.backend.admin.health.ExternalServiceHealthResult;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminDiagnosticsService {

    private final AdminDiagnosticRepository repository;
    private final IotTelemetryRepository telemetryRepository;
    private final AdminAuditLogService auditLogService;
    private final ExternalServiceHealthCheckService externalServiceHealthCheckService;

    public AdminDiagnosticsService(
            AdminDiagnosticRepository repository,
            IotTelemetryRepository telemetryRepository,
            AdminAuditLogService auditLogService,
            ExternalServiceHealthCheckService externalServiceHealthCheckService
    ) {
        this.repository = repository;
        this.telemetryRepository = telemetryRepository;
        this.auditLogService = auditLogService;
        this.externalServiceHealthCheckService = externalServiceHealthCheckService;
    }

    public List<AdminDiagnosticEntity> latest() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional
    public List<AdminDiagnosticEntity> run(AdminDiagnosticRequest request) {
        ExternalServiceHealthResult camera = externalServiceHealthCheckService.checkCamera();
        ExternalServiceHealthResult yolo = externalServiceHealthCheckService.checkYolo();

        create("Backend API", "normal", "Spring Boot request pipeline is available.", "OK");
        create("Database", "normal", "Spring Data repository calls are available.", "OK");
        create("ESP32 telemetry", telemetryRepository.findTopByOrderByIdDesc().isPresent() ? "normal" : "warning", "Checks latest iot_telemetry row.", telemetryRepository.findTopByOrderByIdDesc().isPresent() ? "Telemetry found" : "No telemetry rows yet");
        create("Camera service", diagnosticStatus(camera.status()), camera.detail(), friendlyStatus(camera.status()));
        create("YOLO service", diagnosticStatus(yolo.status()), yolo.detail(), friendlyStatus(yolo.status()));
        auditLogService.record("Diagnostics run", request == null || request.requestedBy() == null ? "admin" : request.requestedBy(), "diagnostics", "normal", "Diagnostics executed.");
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    private String diagnosticStatus(String status) {
        if ("online".equalsIgnoreCase(status)) return "normal";
        if ("slow_response".equalsIgnoreCase(status) || "not_configured".equalsIgnoreCase(status)) return "warning";
        return "critical";
    }

    private String friendlyStatus(String status) {
        if ("online".equalsIgnoreCase(status)) return "Online";
        if ("offline".equalsIgnoreCase(status)) return "Offline";
        if ("slow_response".equalsIgnoreCase(status)) return "Slow Response";
        if ("not_configured".equalsIgnoreCase(status)) return "Not Configured";
        return status;
    }

    private void create(String checkName, String status, String detail, String result) {
        AdminDiagnosticEntity entity = new AdminDiagnosticEntity();
        entity.setCheckName(checkName);
        entity.setStatus(status);
        entity.setDetail(detail);
        entity.setResult(result);
        entity.setCreatedAt(LocalDateTime.now());
        repository.save(entity);
    }
}
