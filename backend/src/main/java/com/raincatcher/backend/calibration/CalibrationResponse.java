package com.raincatcher.backend.calibration;

import java.time.LocalDateTime;

public record CalibrationResponse(
        String status,
        String message,
        String module,
        Double predictedValue,
        Double actualValue,
        Double errorValue,
        Double absoluteError,
        Double accuracyPercent,
        Double calibrationOffset,
        Double calibratedValue,
        String recommendation,
        LocalDateTime createdAt
) {
}
