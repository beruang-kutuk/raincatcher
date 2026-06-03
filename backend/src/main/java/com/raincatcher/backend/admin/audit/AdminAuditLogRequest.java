package com.raincatcher.backend.admin.audit;

public record AdminAuditLogRequest(
        String event,
        String actor,
        String target,
        String status,
        String details
) {
}
