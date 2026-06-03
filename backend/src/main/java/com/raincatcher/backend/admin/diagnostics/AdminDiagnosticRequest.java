package com.raincatcher.backend.admin.diagnostics;

public record AdminDiagnosticRequest(
        String requestedBy,
        String scope
) {
}
