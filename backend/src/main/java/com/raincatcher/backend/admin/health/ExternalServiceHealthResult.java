package com.raincatcher.backend.admin.health;

public record ExternalServiceHealthResult(
        String status,
        String detail,
        String url,
        long responseTimeMs
) {
}
