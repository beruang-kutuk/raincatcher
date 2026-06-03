from __future__ import annotations

from typing import Any

from common.utils import get_number, round2


def _deviation(payload: dict[str, Any], predicted_key: str, observed_key: str) -> tuple[float, float]:
    predicted = get_number(payload, predicted_key, 0.0)
    observed = get_number(payload, observed_key, 0.0)
    absolute = abs(predicted - observed)
    relative = (absolute / abs(observed) * 100.0) if observed else (100.0 if absolute else 0.0)
    return round2(absolute), round2(relative)


def forecast_benchmark(payload: dict[str, Any]) -> dict[str, Any]:
    storage_deviation, storage_relative = _deviation(payload, "predictedStorage", "observedStorage")
    rainfall_deviation, rainfall_relative = _deviation(payload, "predictedRainfall", "observedRainfall")
    usage_deviation, usage_relative = _deviation(payload, "predictedUsage", "observedUsage")

    average_relative = (storage_relative + rainfall_relative + usage_relative) / 3.0
    accuracy = max(0.0, 100.0 - average_relative)

    if accuracy >= 85:
        status = "good"
        recommendation = "Forecast accuracy is strong. Keep current baseline assumptions."
    elif accuracy >= 65:
        status = "moderate"
        recommendation = "Forecast accuracy is moderate. Recheck rainfall and usage assumptions."
    else:
        status = "poor"
        recommendation = "Forecast accuracy is low. Calibrate model inputs before relying on forecasts."

    return {
        "benchmarkAccuracyPercent": round2(accuracy),
        "storageDeviation": storage_deviation,
        "rainfallDeviation": rainfall_deviation,
        "usageDeviation": usage_deviation,
        "status": status,
        "recommendation": recommendation,
    }
