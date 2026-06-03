from __future__ import annotations

from typing import Any

from common.schemas import RAINWATER_TANK_NAME
from common.utils import clamp, get_int, get_number, risk_label, round2


def forecast_what_if_scenario(payload: dict[str, Any]) -> dict[str, Any]:
    scenario_name = str(payload.get("scenarioName") or "Custom Scenario")
    rainfall_change = get_number(payload, "rainfallChangePercent", 0.0)
    usage_change = get_number(payload, "usageChangePercent", 0.0)
    starting_level = clamp(get_number(payload, "startingTankLevelPercent", 70.0))
    capacity = max(get_number(payload, "tankCapacityLitres", 10000.0), 1.0)
    efficiency = clamp(get_number(payload, "collectionEfficiencyPercent", 85.0), 0.0, 100.0)
    forecast_days = max(get_int(payload, "forecastPeriodDays", 7), 1)

    base_daily_harvest_percent = 1.5 * (1.0 + rainfall_change / 100.0) * (efficiency / 85.0)
    base_daily_usage_percent = 1.2 * (1.0 + usage_change / 100.0)

    level = starting_level
    levels: list[float] = []

    for _ in range(forecast_days):
        level = clamp(level + base_daily_harvest_percent - base_daily_usage_percent)
        levels.append(level)

    projected_final = levels[-1]
    lowest_level = min(levels)
    highest_level = max(levels)
    overflow_risk_percent = clamp(max(highest_level - 90.0, 0.0) * 8.0)
    shortage_risk_percent = clamp(max(35.0 - lowest_level, 0.0) * 3.0)

    if shortage_risk_percent >= 35:
        recommendation = "Shortage risk is elevated. Reduce usage or prepare an alternative water source."
    elif overflow_risk_percent >= 35:
        recommendation = "Overflow risk is elevated. Confirm overflow drainage and collection controls."
    else:
        recommendation = "Scenario remains within acceptable operating range."

    return {
        "tank": RAINWATER_TANK_NAME,
        "scenarioName": scenario_name,
        "projectedFinalLevel": round2(projected_final),
        "lowestLevel": round2(lowest_level),
        "overflowRiskPercent": round2(overflow_risk_percent),
        "overflowRisk": risk_label(overflow_risk_percent),
        "shortageRiskPercent": round2(shortage_risk_percent),
        "shortageRisk": risk_label(shortage_risk_percent),
        "scenarioSummary": (
            f"{scenario_name}: rainfall {rainfall_change:+.0f}%, usage {usage_change:+.0f}%, "
            f"start {starting_level:.0f}%, capacity {capacity:.0f} L, efficiency {efficiency:.0f}%, "
            f"{forecast_days} days."
        ),
        "recommendation": recommendation,
    }
