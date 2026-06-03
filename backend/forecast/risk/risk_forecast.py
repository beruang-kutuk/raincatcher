from __future__ import annotations

from typing import Any

from common.schemas import RAINWATER_TANK_NAME
from common.utils import average, clamp, get_int, get_number, get_number_list, risk_label, round2


def forecast_risk(payload: dict[str, Any]) -> dict[str, Any]:
    projected_levels = get_number_list(payload, "projectedTankLevels", [])
    rainfall_forecast = get_number_list(payload, "rainfallForecast", [])
    ph_value = get_number(payload, "phValue", 7.0)
    turbidity = get_number(payload, "turbidityNtu", 0.0)
    water_temperature = get_number(payload, "waterTemperatureCelsius", 25.0)
    anomaly_count = get_int(payload, "anomalyCount", 0)
    camera_anomaly_count = get_int(payload, "cameraAnomalyCount", 0)

    highest_level = max(projected_levels) if projected_levels else 0.0
    lowest_level = min(projected_levels) if projected_levels else 100.0
    rainfall_pressure = average(rainfall_forecast, 0.0)

    overflow_risk = clamp(max(highest_level - 80.0, 0.0) * 5.0 + max(rainfall_pressure - 25.0, 0.0))
    shortage_risk = clamp(max(35.0 - lowest_level, 0.0) * 3.0)

    ph_penalty = abs(ph_value - 7.2) * 18.0
    turbidity_penalty = max(turbidity - 5.0, 0.0) * 8.0
    temperature_penalty = max(water_temperature - 35.0, 0.0) * 5.0
    water_quality_risk = clamp(ph_penalty + turbidity_penalty + temperature_penalty)

    sensor_reliability_risk = clamp((anomaly_count * 12.0) + (camera_anomaly_count * 15.0))
    overall_score = max(
        overflow_risk,
        shortage_risk,
        water_quality_risk,
        sensor_reliability_risk,
        average([overflow_risk, shortage_risk, water_quality_risk, sensor_reliability_risk]),
    )
    overall_level = risk_label(overall_score)

    if overall_level == "high":
        recommended_action = "Investigate high-risk module immediately and confirm sensor/camera readings."
    elif overall_level == "medium":
        recommended_action = "Schedule inspection and monitor the next telemetry update."
    else:
        recommended_action = "Continue normal monitoring."

    return {
        "tank": RAINWATER_TANK_NAME,
        "overflowRiskPercent": round2(overflow_risk),
        "shortageRiskPercent": round2(shortage_risk),
        "waterQualityRiskPercent": round2(water_quality_risk),
        "sensorReliabilityRiskPercent": round2(sensor_reliability_risk),
        "overallRiskLevel": overall_level,
        "recommendedAction": recommended_action,
    }
