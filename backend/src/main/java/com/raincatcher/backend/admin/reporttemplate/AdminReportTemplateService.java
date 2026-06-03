package com.raincatcher.backend.admin.reporttemplate;

import com.raincatcher.backend.admin.audit.AdminAuditLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminReportTemplateService {

    private final AdminReportTemplateRepository repository;
    private final AdminAuditLogService auditLogService;

    public AdminReportTemplateService(AdminReportTemplateRepository repository, AdminAuditLogService auditLogService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public List<AdminReportTemplateEntity> list() {
        seedDefaults();
        return repository.findAllByOrderByUpdatedAtDesc();
    }

    @Transactional
    public AdminReportTemplateEntity create(AdminReportTemplateRequest request) {
        AdminReportTemplateEntity entity = new AdminReportTemplateEntity();
        apply(entity, request);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        AdminReportTemplateEntity saved = repository.save(entity);
        auditLogService.record("Report template created", "admin", saved.getName(), "normal", "Template created.");
        return saved;
    }

    @Transactional
    public AdminReportTemplateEntity update(Long id, AdminReportTemplateRequest request) {
        AdminReportTemplateEntity entity = repository.findById(id).orElseThrow();
        apply(entity, request);
        entity.setUpdatedAt(LocalDateTime.now());
        AdminReportTemplateEntity saved = repository.save(entity);
        auditLogService.record("Report template updated", "admin", saved.getName(), "normal", "Template updated.");
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        repository.findById(id).ifPresent((entity) ->
                auditLogService.record("Report template deleted", "admin", entity.getName(), "warning", "Template deleted.")
        );
        repository.deleteById(id);
    }

    private void seedDefaults() {
        if (repository.count() > 0) return;
        create(new AdminReportTemplateRequest(
                "Weekly Operations Report",
                "Default weekly report template for telemetry, forecasts, anomalies, and images.",
                "[\"Telemetry summary\",\"Forecast summary\",\"Anomaly events\",\"Camera snapshots\",\"Recommendations\"]",
                true
        ));
    }

    private void apply(AdminReportTemplateEntity entity, AdminReportTemplateRequest request) {
        if (request == null) return;
        if (hasText(request.name())) entity.setName(request.name().trim());
        if (request.description() != null) entity.setDescription(request.description().trim());
        if (request.sectionsJson() != null) entity.setSectionsJson(request.sectionsJson().trim());
        if (request.enabled() != null) entity.setEnabled(request.enabled());
        if (entity.getEnabled() == null) entity.setEnabled(true);
        if (!hasText(entity.getName())) entity.setName("Raincatcher Report Template");
        if (entity.getSectionsJson() == null) entity.setSectionsJson("[]");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
