from __future__ import annotations

from typing import Any

from common.schemas import RAINWATER_TANK_NAME
from common.utils import clamp, get_number, round2


def forecast_usable_water(payload: dict[str, Any]) -> dict[str, Any]:
    current_volume = get_number(payload, "currentTankVolumeLitres", 0.0)
    ph_value = get_number(payload, "phValue", 7.0)
    turbidity = get_number(payload, "turbidityNtu", 0.0)
    water_temperature = get_number(payload, "waterTemperatureCelsius", 25.0)

    ph_penalty = max(abs(ph_value - 7.2) - 0.3, 0.0) * 18.0
    turbidity_penalty = max(turbidity - 5.0, 0.0) * 7.0
    temperature_penalty = max(water_temperature - 35.0, 0.0) * 4.0
    quality_score = clamp(100.0 - ph_penalty - turbidity_penalty - temperature_penalty)
    usable_percent = quality_score
    usable_litres = current_volume * usable_percent / 100.0
    non_usable_litres = max(current_volume - usable_litres, 0.0)

    if quality_score < 60:
        recommendation = "Water quality is poor. Inspect pH/turbidity sensors and avoid non-treated use."
    elif quality_score < 80:
        recommendation = "Usable water is reduced. Monitor quality before broad use."
    else:
        recommendation = "Water quality is acceptable for the current baseline rule set."

    return {
        "tank": RAINWATER_TANK_NAME,
        "qualityScore": round2(quality_score),
        "usableWaterPercent": round2(usable_percent),
        "usableWaterLitres": round2(usable_litres),
        "nonUsableWaterLitres": round2(non_usable_litres),
        "recommendation": recommendation,
    }
