package com.raincatcher.backend.calibration;

import java.time.LocalDateTime;
import java.util.List;

public record CalibrationSummaryResponse(
        String modelStatus,
        LocalDateTime lastCalibrationAt,
        Double sensorDrift,
        Double calibrationAccuracy,
        Double calibrationOffset,
        Double calibratedValue,
        LocalDateTime nextRecommendedCalibration,
        String recommendation,
        long historyCount,
        boolean canRunCalibration,
        String message,
        List<String> recommendations
) {
}
