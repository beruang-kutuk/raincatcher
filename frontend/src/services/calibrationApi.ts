import { buildBackendUrl } from "./apiConfig";

export type CalibrationSummaryResponse = {
    modelStatus: "Calibrated" | "Pending" | "Needs Calibration" | string;
    lastCalibrationAt: string | null;
    sensorDrift: number | null;
    calibrationAccuracy: number | null;
    calibrationOffset: number | null;
    calibratedValue: number | null;
    nextRecommendedCalibration: string | null;
    recommendation: string;
    historyCount: number;
    canRunCalibration: boolean;
    message: string;
    recommendations: string[];
};

export type CalibrationRecord = {
    id: number;
    module: string;
    predictedValue: number | null;
    actualValue: number | null;
    errorValue: number | null;
    absoluteError: number | null;
    accuracyPercent: number | null;
    calibrationOffset: number | null;
    calibratedValue: number | null;
    recommendation: string;
    createdAt: string;
};

export type CalibrationRequest = {
    module?: string;
    predictedValue?: number;
    actualValue?: number;
};

export type CalibrationResponse = {
    status: "completed" | "blocked" | "empty" | string;
    message: string;
    module: string;
    predictedValue: number | null;
    actualValue: number | null;
    errorValue: number | null;
    absoluteError: number | null;
    accuracyPercent: number | null;
    calibrationOffset: number | null;
    calibratedValue: number | null;
    recommendation: string;
    createdAt: string;
};

async function calibrationJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) {
        throw new Error(`Calibration request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export function getCalibrationSummary() {
    return calibrationJson<CalibrationSummaryResponse>("/api/calibration/summary");
}

export function getCalibrationHistory() {
    return calibrationJson<CalibrationRecord[]>("/api/calibration/history");
}

export function runTankStorageCalibration(payload: CalibrationRequest = {}) {
    return calibrationJson<CalibrationResponse>("/api/calibration/tank-storage", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function resetCalibration() {
    return calibrationJson<CalibrationResponse>("/api/calibration/reset", {
        method: "POST",
    });
}

export function applyNewBaseline() {
    return calibrationJson<CalibrationResponse>("/api/calibration/apply-baseline", {
        method: "POST",
    });
}
