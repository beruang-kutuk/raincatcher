import { buildBackendUrl } from "./apiConfig";

async function postForecastJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
    const response = await fetch(buildBackendUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`Forecast service request failed with status ${response.status}: ${path}`);
    }
    return (await response.json()) as TRes;
}

export type TankStorageRequest = {
    currentTankVolumeLitres: number;
    tankCapacityLitres: number;
    dailyUsageLitres: number;
    catchmentAreaM2: number;
    runoffCoefficient: number;
    forecastDays: number;
    dailyRainfallMm: number[];
};

export type TankStorageDailyPoint = {
    day: number;
    rainfallMm: number;
    harvestLitres: number;
    usageLitres: number;
    storageLitres: number;
    levelPercent: number;
};

export type TankStorageResponse = {
    tank: string;
    dailyProjection: TankStorageDailyPoint[];
    finalLevelPercent: number;
    lowestLevelPercent: number;
    highestLevelPercent: number;
    overflowDays: number;
    shortageDays: number;
    recommendation: string;
    rawForecastLevel?: number;
    calibrationOffset?: number;
    calibratedForecastLevel?: number;
    calibrationApplied?: boolean;
    calibrationAccuracyPercent?: number;
};

export type WhatIfScenarioRequest = {
    scenarioName?: string;
    rainfallChangePercent: number;
    usageChangePercent: number;
    startingTankLevelPercent: number;
    tankCapacityLitres?: number;
    collectionEfficiencyPercent?: number;
    forecastPeriodDays: number;
};

export type WhatIfScenarioResponse = {
    tank: string;
    scenarioName: string;
    projectedFinalLevel: number;
    lowestLevel: number;
    overflowRiskPercent: number;
    overflowRisk: string;
    shortageRiskPercent: number;
    shortageRisk: string;
    scenarioSummary: string;
    recommendation: string;
};

export type BenchmarkRequest = {
    forecastedLevelPercent?: number;
    observedLevelPercent?: number;
    forecastedHarvestLitres?: number;
    observedHarvestLitres?: number;
};

export type BenchmarkResponse = {
    tank: string;
    deviationPercent?: number;
    accuracyPercent?: number;
    recommendation: string;
    [key: string]: unknown;
};

export type WeeklyHarvestRequest = {
    catchmentAreaM2: number;
    runoffCoefficient: number;
    weeklyRainfallMm: number[];
};

export type WeeklyHarvestResponse = {
    tank: string;
    dailyHarvest: number[];
    totalHarvestLitres: number;
    recommendation: string;
    [key: string]: unknown;
};

export type MonthlyHarvestRequest = {
    catchmentAreaM2: number;
    runoffCoefficient: number;
    monthlyRainfallMm: number[];
};

export type MonthlyHarvestResponse = {
    tank: string;
    totalHarvestLitres: number;
    recommendation: string;
    [key: string]: unknown;
};

export type UsableWaterRequest = {
    currentTankVolumeLitres: number;
    tankCapacityLitres: number;
    ph?: number;
    turbidityNtu?: number;
};

export type UsableWaterResponse = {
    tank: string;
    usableWaterLitres: number;
    usableWaterPercent: number;
    recommendation: string;
    [key: string]: unknown;
};

export type RiskRequest = {
    projectedTankLevels?: number[];
    rainfallForecast?: number[];
    phValue?: number;
    turbidityNtu?: number;
    waterTemperatureCelsius?: number;
    anomalyCount?: number;
    cameraAnomalyCount?: number;
};

export type RiskResponse = {
    tank: string;
    overallRiskLevel: "low" | "medium" | "high" | string;
    overflowRiskPercent: number;
    shortageRiskPercent: number;
    waterQualityRiskPercent: number;
    sensorReliabilityRiskPercent: number;
    recommendedAction: string;
    [key: string]: unknown;
};

export type AiRecommendationResponse = {
    tank: string;
    severity: "low" | "medium" | "high" | string;
    recommendation: string;
    actions?: string[];
    sourceValues?: Record<string, unknown>;
    createdAt: string;
    [key: string]: unknown;
};

export function getTankStorageForecast(payload: TankStorageRequest): Promise<TankStorageResponse> {
    return postForecastJson<TankStorageRequest, TankStorageResponse>("/api/forecast/tank-storage", payload);
}

export function getWhatIfScenario(payload: WhatIfScenarioRequest): Promise<WhatIfScenarioResponse> {
    return postForecastJson<WhatIfScenarioRequest, WhatIfScenarioResponse>("/api/forecast/what-if-scenario", payload);
}

export function getBenchmarkForecast(payload: BenchmarkRequest): Promise<BenchmarkResponse> {
    return postForecastJson<BenchmarkRequest, BenchmarkResponse>("/api/forecast/benchmark", payload);
}

export function getWeeklyHarvestForecast(payload: WeeklyHarvestRequest): Promise<WeeklyHarvestResponse> {
    return postForecastJson<WeeklyHarvestRequest, WeeklyHarvestResponse>("/api/forecast/weekly-harvest", payload);
}

export function getMonthlyHarvestForecast(payload: MonthlyHarvestRequest): Promise<MonthlyHarvestResponse> {
    return postForecastJson<MonthlyHarvestRequest, MonthlyHarvestResponse>("/api/forecast/monthly-harvest", payload);
}

export function getUsableWaterForecast(payload: UsableWaterRequest): Promise<UsableWaterResponse> {
    return postForecastJson<UsableWaterRequest, UsableWaterResponse>("/api/forecast/usable-water", payload);
}

export function getRiskForecast(payload: RiskRequest): Promise<RiskResponse> {
    return postForecastJson<RiskRequest, RiskResponse>("/api/forecast/risk", payload);
}

export function getAiRecommendationForecast(payload: Record<string, never> = {}): Promise<AiRecommendationResponse> {
    return postForecastJson<Record<string, never>, AiRecommendationResponse>("/api/forecast/ai-recommendation", payload);
}
