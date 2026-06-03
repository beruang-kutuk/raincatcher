package com.raincatcher.backend.admin.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminAuditLogService {

    private final AdminAuditLogRepository repository;

    public AdminAuditLogService(AdminAuditLogRepository repository) {
        this.repository = repository;
    }

    public List<AdminAuditLogEntity> list() {
        return repository.findTop100ByOrderByCreatedAtDesc();
    }

    @Transactional
    public AdminAuditLogEntity create(AdminAuditLogRequest request) {
        return record(
                text(request == null ? null : request.event(), "Admin event"),
                text(request == null ? null : request.actor(), "system"),
                text(request == null ? null : request.target(), "admin"),
                text(request == null ? null : request.status(), "normal"),
                text(request == null ? null : request.details(), "")
        );
    }

    @Transactional
    public AdminAuditLogEntity record(String event, String actor, String target, String status, String details) {
        AdminAuditLogEntity entity = new AdminAuditLogEntity();
        entity.setEvent(text(event, "Admin event"));
        entity.setActor(text(actor, "system"));
        entity.setTarget(text(target, "admin"));
        entity.setStatus(text(status, "normal"));
        entity.setDetails(details == null ? "" : details);
        entity.setCreatedAt(LocalDateTime.now());
        return repository.save(entity);
    }

    @Transactional
    public void clear() {
        repository.deleteAll();
    }

    private String text(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
