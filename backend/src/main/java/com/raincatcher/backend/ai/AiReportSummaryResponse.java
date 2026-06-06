package com.raincatcher.backend.ai;

import java.time.LocalDateTime;
import java.util.List;

public record AiReportSummaryResponse(
        String severity,
        String title,
        String summary,
        List<AiEvidenceItem> evidence,
        List<String> highlights,
        List<String> recommendedActions,
        String source,
        LocalDateTime createdAt
) {
}
