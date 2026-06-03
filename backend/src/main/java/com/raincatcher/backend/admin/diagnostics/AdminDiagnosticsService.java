package com.raincatcher.backend.admin.diagnostics;

import com.raincatcher.backend.admin.audit.AdminAuditLogService;
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

    public AdminDiagnosticsService(
            AdminDiagnosticRepository repository,
            IotTelemetryRepository telemetryRepository,
            AdminAuditLogService auditLogService
    ) {
        this.repository = repository;
        this.telemetryRepository = telemetryRepository;
        this.auditLogService = auditLogService;
    }

    public List<AdminDiagnosticEntity> latest() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional
    public List<AdminDiagnosticEntity> run(AdminDiagnosticRequest request) {
        create("Backend API", "normal", "Spring Boot request pipeline is available.", "OK");
        create("Database", "normal", "Spring Data repository calls are available.", "OK");
        create("ESP32 telemetry", telemetryRepository.findTopByOrderByIdDesc().isPresent() ? "normal" : "warning", "Checks latest iot_telemetry row.", telemetryRepository.findTopByOrderByIdDesc().isPresent() ? "Telemetry found" : "No telemetry rows yet");
        create("Camera service", "warning", "Pi camera endpoint target exists in architecture.", "Not implemented");
        create("YOLO service", "warning", "YOLO endpoint target exists in architecture.", "Not implemented");
        auditLogService.record("Diagnostics run", request == null || request.requestedBy() == null ? "admin" : request.requestedBy(), "diagnostics", "normal", "Diagnostics executed.");
        return repository.findTop50ByOrderByCreatedAtDesc();
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
