from __future__ import annotations

from typing import Any

from common.schemas import RAINWATER_TANK_NAME
from common.utils import clamp, get_number, get_number_list, percent, round2


def forecast_weekly_harvest(payload: dict[str, Any]) -> dict[str, Any]:
    rainfall_values = get_number_list(payload, "dailyRainfallForecast", [0.0] * 7)
    if len(rainfall_values) < 7:
        rainfall_values = rainfall_values + [rainfall_values[-1] if rainfall_values else 0.0] * (7 - len(rainfall_values))

    catchment_area = get_number(payload, "catchmentAreaM2", 0.0)
    runoff = clamp(get_number(payload, "runoffCoefficient", 0.8), 0.0, 1.0)
    current_volume = get_number(payload, "currentTankVolumeLitres", 0.0)
    capacity = max(get_number(payload, "tankCapacityLitres", 1.0), 1.0)
    daily_usage = get_number(payload, "dailyUsageLitres", 0.0)

    storage = clamp(current_volume, 0.0, capacity)
    daily_harvest: list[dict[str, Any]] = []

    for index, rainfall_mm in enumerate(rainfall_values[:7], start=1):
        harvest_litres = rainfall_mm * catchment_area * runoff
        storage = clamp(storage + harvest_litres - daily_usage, 0.0, capacity)
        daily_harvest.append(
            {
                "day": index,
                "rainfallMm": round2(rainfall_mm),
                "harvestLitres": round2(harvest_litres),
                "projectedStorageLitres": round2(storage),
                "levelPercent": percent(storage, capacity),
            }
        )

    weekly_total = sum(item["harvestLitres"] for item in daily_harvest)
    final_percent = percent(storage, capacity)

    if weekly_total <= 0:
        recommendation = "No rainfall harvest is expected this week. Monitor usage and backup supply."
    elif final_percent < 35:
        recommendation = "Weekly harvest may be insufficient. Reduce optional demand."
    else:
        recommendation = "Weekly harvest is adequate for the current usage assumption."

    return {
        "tank": RAINWATER_TANK_NAME,
        "weeklyTotalHarvestLitres": round2(weekly_total),
        "dailyHarvestLitres": daily_harvest,
        "projectedFinalStorageLitres": round2(storage),
        "projectedFinalStoragePercent": final_percent,
        "recommendation": recommendation,
    }
