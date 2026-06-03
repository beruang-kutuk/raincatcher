package com.raincatcher.backend.admin.threshold;

import com.raincatcher.backend.admin.audit.AdminAuditLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AdminThresholdService {

    private final AdminThresholdRepository repository;
    private final AdminAuditLogService auditLogService;

    public AdminThresholdService(AdminThresholdRepository repository, AdminAuditLogService auditLogService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public List<AdminThresholdEntity> list() {
        seedDefaults();
        return repository.findAllByOrderByIdAsc();
    }

    @Transactional
    public List<AdminThresholdEntity> update(AdminThresholdRequest request) {
        seedDefaults();
        if (request != null && request.values() != null) {
            request.values().forEach((key, value) ->
                    repository.findByThresholdKey(key).ifPresent((entity) -> {
                        entity.setValue(value);
                        entity.setUpdatedAt(LocalDateTime.now());
                        repository.save(entity);
                    })
            );
        }
        auditLogService.record("Thresholds updated", "admin", "thresholds", "normal", "Admin threshold values saved.");
        return repository.findAllByOrderByIdAsc();
    }

    @Transactional
    public List<AdminThresholdEntity> reset() {
        repository.deleteAll();
        seedDefaults();
        auditLogService.record("Thresholds reset", "admin", "thresholds", "warning", "Admin thresholds reset to defaults.");
        return repository.findAllByOrderByIdAsc();
    }

    private void seedDefaults() {
        if (repository.count() > 0) return;
        seed("ph_min", "pH minimum", "6.5", "pH", "warning", "Lower pH warning threshold.");
        seed("ph_max", "pH maximum", "8.5", "pH", "warning", "Upper pH warning threshold.");
        seed("turbidity_high", "High turbidity", "100", "NTU", "critical", "Critical turbidity anomaly threshold.");
        seed("tank_low", "Low tank level", "20", "%", "warning", "Tank shortage warning threshold.");
        seed("tank_overflow", "Overflow risk", "90", "%", "warning", "High storage threshold when rain is expected.");
        seed("telemetry_timeout", "Telemetry timeout", "120", "seconds", "warning", "ESP32 stale telemetry threshold.");
    }

    private void seed(String key, String label, String value, String unit, String severity, String helper) {
        AdminThresholdEntity entity = new AdminThresholdEntity();
        entity.setThresholdKey(key);
        entity.setLabel(label);
        entity.setValue(value);
        entity.setUnit(unit);
        entity.setSeverity(severity);
        entity.setHelper(helper);
        entity.setUpdatedAt(LocalDateTime.now());
        repository.save(entity);
    }
}
