import { buildBackendUrl } from "./apiConfig";

export type SimulationScenarioRecord = {
    id: number;
    scenarioName: string;
    sourceType: "LOCAL" | "BACKEND" | string;
    tankName: string;
    startingLevelPercent: number | null;
    finalLevelPercent: number | null;
    lowestLevelPercent: number | null;
    highestLevelPercent: number | null;
    rainfallMm: number | null;
    dailyUsageM3: number | null;
    tankCapacityM3: number | null;
    collectionEfficiencyPercent: number | null;
    overflowRisk: string;
    shortageRisk: string;
    recommendation: string;
    projectionJson: string | null;
    createdAt: string;
};

export type SaveScenarioPayload = {
    scenarioName: string;
    sourceType: "LOCAL" | "BACKEND";
    tankName: string;
    startingLevelPercent: number;
    finalLevelPercent: number;
    lowestLevelPercent: number;
    highestLevelPercent?: number;
    rainfallMm: number;
    dailyUsageM3: number;
    tankCapacityM3: number;
    collectionEfficiencyPercent: number;
    overflowRisk: string;
    shortageRisk: string;
    recommendation: string;
    projectionJson: string;
};

async function fetchSimulationJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(buildBackendUrl(path), {
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        ...init,
    });
    if (!response.ok) {
        throw new Error(`Simulation request failed: ${response.status} ${path}`);
    }
    return (await response.json()) as T;
}

export function getSimulationScenarios(): Promise<SimulationScenarioRecord[]> {
    return fetchSimulationJson<SimulationScenarioRecord[]>("/api/simulation/scenarios");
}

export function saveSimulationScenario(payload: SaveScenarioPayload): Promise<SimulationScenarioRecord> {
    return fetchSimulationJson<SimulationScenarioRecord>("/api/simulation/scenarios", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function deleteSimulationScenario(id: number): Promise<{ status: string; id: number }> {
    return fetchSimulationJson<{ status: string; id: number }>(`/api/simulation/scenarios/${id}`, {
        method: "DELETE",
    });
}
