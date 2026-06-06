package com.raincatcher.backend.ai;

import java.time.LocalDateTime;
import java.util.List;

public record AiAdvisorResponse(
        String severity,
        String title,
        String summary,
        List<AiEvidenceItem> evidence,
        List<String> recommendedActions,
        List<String> humanDecisionOptions,
        String source,
        LocalDateTime createdAt
) {
}
