from __future__ import annotations

from statistics import mean
from typing import Any


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def round2(value: float) -> float:
    return round(float(value), 2)


def get_number(data: dict[str, Any], key: str, default: float = 0.0) -> float:
    value = data.get(key, default)

    if value is None or value == "":
        return float(default)

    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def get_int(data: dict[str, Any], key: str, default: int = 0) -> int:
    return int(round(get_number(data, key, float(default))))


def get_number_list(data: dict[str, Any], key: str, default: list[float] | None = None) -> list[float]:
    value = data.get(key)

    if value is None:
        return list(default or [])

    if isinstance(value, list):
        return [get_number({"value": item}, "value", 0.0) for item in value]

    return [get_number(data, key, 0.0)]


def percent(part: float, whole: float) -> float:
    if whole <= 0:
        return 0.0
    return round2((part / whole) * 100)


def risk_label(value: float) -> str:
    if value >= 70:
        return "high"
    if value >= 35:
        return "medium"
    return "low"


def average(values: list[float], default: float = 0.0) -> float:
    return float(mean(values)) if values else default


def storage_recommendation(final_level: float, lowest_level: float, overflow_days: int, shortage_days: int) -> str:
    if overflow_days > 0:
        return "Overflow risk detected. Inspect overflow route and consider reducing incoming collection."
    if shortage_days > 0 or lowest_level < 25:
        return "Shortage risk detected. Reduce non-essential usage or prepare a backup water source."
    if final_level < 45:
        return "Storage is trending low. Monitor usage and rainfall forecast closely."
    return "Storage projection is within the normal operating range."
