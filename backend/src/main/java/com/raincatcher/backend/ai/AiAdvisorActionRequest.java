package com.raincatcher.backend.ai;

public record AiAdvisorActionRequest(
        String action,
        String note,
        String user
) {
}
