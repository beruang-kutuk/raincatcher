package com.raincatcher.backend.admin.threshold;

import java.util.Map;

public record AdminThresholdRequest(
        Map<String, String> values
) {
}
