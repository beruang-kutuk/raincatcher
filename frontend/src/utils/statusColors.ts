export const STATUS_COLORS = {
    good: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    neutral: "#8ea7ff",
} as const;

export type WaterLevelStatus = "danger" | "warning" | "good";

/**
 * Thresholds: 0–24 = danger, 25–59 = warning, 60–100 = good.
 * Applies to water level %, storage %, forecast accuracy %, and similar 0-100 metrics.
 */
export function getWaterLevelStatus(value: number): WaterLevelStatus {
    if (value < 25) return "danger";
    if (value < 60) return "warning";
    return "good";
}

export function getStatusColor(value: number): string {
    const status = getWaterLevelStatus(value);
    return STATUS_COLORS[status];
}

/** Map WaterLevelStatus to the existing dashboard CSS pill class names. */
export function getStatusPillClass(value: number): string {
    const status = getWaterLevelStatus(value);
    if (status === "danger") return "status-flagged";
    if (status === "warning") return "status-warning";
    return "status-normal";
}

/**
 * Colour rainfall bars/points by intensity.
 * < 3 mm = green (light), 3–7.9 mm = yellow (moderate), ≥ 8 mm = red (heavy).
 */
export function getRainfallStatusColor(mm: number): string {
    if (mm < 3) return STATUS_COLORS.good;
    if (mm < 8) return STATUS_COLORS.warning;
    return STATUS_COLORS.danger;
}

export const RAINFALL_LEGEND = [
    { label: "Light  < 3 mm",    color: STATUS_COLORS.good },
    { label: "Moderate  3–8 mm", color: STATUS_COLORS.warning },
    { label: "Heavy  ≥ 8 mm",    color: STATUS_COLORS.danger },
] as const;
