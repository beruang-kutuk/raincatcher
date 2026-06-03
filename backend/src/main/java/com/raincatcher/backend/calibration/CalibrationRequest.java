package com.raincatcher.backend.calibration;

public record CalibrationRequest(
        String module,
        Double predictedValue,
        Double actualValue
) {
}
