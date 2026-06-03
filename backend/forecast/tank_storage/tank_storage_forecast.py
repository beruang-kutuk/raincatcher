from __future__ import annotations

from typing import Any

from common.schemas import RAINWATER_TANK_NAME
from common.utils import clamp, get_int, get_number, get_number_list, percent, round2, storage_recommendation


def forecast_tank_storage(payload: dict[str, Any]) -> dict[str, Any]:
    current_volume = get_number(payload, "currentTankVolumeLitres", 0.0)
    capacity = max(get_number(payload, "tankCapacityLitres", 1.0), 1.0)
    daily_usage = get_number(payload, "dailyUsageLitres", 0.0)
    catchment_area = get_number(payload, "catchmentAreaM2", 0.0)
    runoff = clamp(get_number(payload, "runoffCoefficient", 0.8), 0.0, 1.0)
    forecast_days = max(get_int(payload, "forecastDays", 7), 1)
    rainfall_values = get_number_list(payload, "dailyRainfallMm", [0.0])

    volume = clamp(current_volume, 0.0, capacity)
    daily_projection: list[dict[str, Any]] = []
    overflow_days = 0
    shortage_days = 0

    for index in range(forecast_days):
        rainfall_mm = rainfall_values[index] if index < len(rainfall_values) else rainfall_values[-1]
        harvest_litres = rainfall_mm * catchment_area * runoff
        raw_volume = volume + harvest_litres - daily_usage

        if raw_volume > capacity:
            overflow_days += 1

        volume = clamp(raw_volume, 0.0, capacity)
        level_percent = percent(volume, capacity)

        if level_percent < 20 or volume <= 0:
            shortage_days += 1

        daily_projection.append(
            {
                "day": index + 1,
                "rainfallMm": round2(rainfall_mm),
                "harvestLitres": round2(harvest_litres),
                "usageLitres": round2(daily_usage),
                "storageLitres": round2(volume),
                "levelPercent": level_percent,
            }
        )

    levels = [point["levelPercent"] for point in daily_projection]
    final_level = levels[-1]
    lowest_level = min(levels)
    highest_level = max(levels)

    return {
        "tank": RAINWATER_TANK_NAME,
        "dailyProjection": daily_projection,
        "finalLevelPercent": final_level,
        "lowestLevelPercent": lowest_level,
        "highestLevelPercent": highest_level,
        "overflowDays": overflow_days,
        "shortageDays": shortage_days,
        "recommendation": storage_recommendation(final_level, lowest_level, overflow_days, shortage_days),
    }
