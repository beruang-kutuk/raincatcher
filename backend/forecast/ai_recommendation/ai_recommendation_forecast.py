from __future__ import annotations

from typing import Any

from common.utils import get_int


def forecast_ai_recommendation(payload: dict[str, Any]) -> dict[str, Any]:
    telemetry_summary = payload.get("telemetrySummary") or {}
    forecast_summary = payload.get("forecastSummary") or {}
    risk_summary = payload.get("riskSummary") or {}
    camera_analysis = payload.get("cameraAnalysisResult") or {}
    weather_summary = payload.get("weatherSummary") or {}
    anomaly_count = get_int(payload, "anomalyCount", 0)

    risk_level = str(risk_summary.get("overallRiskLevel") or "low").lower()
    camera_status = str(camera_analysis.get("status") or "unknown")

    if camera_status in {"blocked_or_unusable", "overexposed", "too_dark", "blurry"}:
        priority = "medium"
        title = "Camera inspection recommended"
        related_module = "camera_ml"
        suggested_action = "Review camera position, lens clarity, lighting, and latest frame before trusting image-based checks."
    elif risk_level == "high" or anomaly_count >= 3:
        priority = "high"
        title = "Operational risk needs review"
        related_module = "risk"
        suggested_action = "Inspect active anomalies, tank level projection, and water quality readings."
    elif risk_level == "medium":
        priority = "medium"
        title = "Monitor forecast risk"
        related_module = "forecast"
        suggested_action = "Watch the next forecast cycle and compare against observed telemetry."
    else:
        priority = "low"
        title = "System operating normally"
        related_module = "dashboard"
        suggested_action = "Continue routine monitoring."

    message = (
        f"{title}. Telemetry summary: {telemetry_summary or 'pending'}. "
        f"Forecast summary: {forecast_summary or 'pending'}. "
        f"Weather summary: {weather_summary or 'pending'}."
    )

    return {
        "recommendationTitle": title,
        "message": message,
        "priority": priority,
        "relatedModule": related_module,
        "suggestedAction": suggested_action,
        "explanation": "Baseline rule-based recommendation prepared for replacement by a trained model later.",
    }
