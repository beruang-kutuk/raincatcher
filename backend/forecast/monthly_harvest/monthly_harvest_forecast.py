from __future__ import annotations

from typing import Any

from common.schemas import RAINWATER_TANK_NAME
from common.utils import clamp, get_number, percent, risk_label, round2


def forecast_monthly_harvest(payload: dict[str, Any]) -> dict[str, Any]:
    monthly_rainfall = get_number(payload, "monthlyRainfallMm", 0.0)
    catchment_area = get_number(payload, "catchmentAreaM2", 0.0)
    runoff = clamp(get_number(payload, "runoffCoefficient", 0.8), 0.0, 1.0)
    current_volume = get_number(payload, "currentTankVolumeLitres", 0.0)
    capacity = max(get_number(payload, "tankCapacityLitres", 1.0), 1.0)
    monthly_usage = get_number(payload, "expectedMonthlyUsageLitres", 0.0)

    harvest = monthly_rainfall * catchment_area * runoff
    raw_final_storage = current_volume + harvest - monthly_usage
    final_storage = clamp(raw_final_storage, 0.0, capacity)
    final_percent = percent(final_storage, capacity)
    overflow_percent = clamp(percent(max(current_volume + harvest - capacity, 0.0), capacity), 0.0, 100.0)
    shortage_percent = clamp(100.0 - final_percent if final_percent < 35 else 0.0, 0.0, 100.0)

    if overflow_percent >= 35:
        recommendation = "Monthly rainfall may exceed storage capacity. Prepare overflow handling."
    elif shortage_percent >= 35:
        recommendation = "Monthly storage may fall below reserve level. Reduce usage or plan backup supply."
    else:
        recommendation = "Monthly harvest projection is within acceptable storage limits."

    return {
        "tank": RAINWATER_TANK_NAME,
        "estimatedHarvestLitres": round2(harvest),
        "expectedFinalStorageLitres": round2(final_storage),
        "expectedFinalStoragePercent": final_percent,
        "overflowRiskPercent": round2(overflow_percent),
        "overflowRisk": risk_label(overflow_percent),
        "shortageRiskPercent": round2(shortage_percent),
        "shortageRisk": risk_label(shortage_percent),
        "recommendation": recommendation,
    }
