import { buildBackendUrl } from "./apiConfig";

export type BackendAnomaly = {
    id?: number;
    tankId?: string | null;
    deviceId?: string | null;
    telemetryId?: number | null;
    cameraRecordId?: number | null;
    source?: string | null;
    sourceTag?: string | null;
    title?: string | null;
    description?: string | null;
    severity?: "high" | "medium" | "low" | string | null;
    status?: "unresolved" | "investigating" | "resolved" | string | null;
    valueText?: string | null;
    recommendation?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    resolvedAt?: string | null;
};

export type AnomalySummary = {
    active: number;
    high: number;
    medium: number;
    low: number;
    recent: BackendAnomaly[];
};

async function fetchAnomalyJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(buildBackendUrl(path), {
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        ...init,
    });
    if (!response.ok) {
        throw new Error(`Anomaly request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export function getAnomalies() {
    return fetchAnomalyJson<BackendAnomaly[]>("/api/anomalies");
}

export function getAnomalySummary() {
    return fetchAnomalyJson<AnomalySummary>("/api/anomalies/summary");
}

export function createAnomaly(anomaly: BackendAnomaly) {
    return fetchAnomalyJson<BackendAnomaly>("/api/anomalies", {
        method: "POST",
        body: JSON.stringify(anomaly),
    });
}

export function updateAnomaly(id: number, anomaly: Partial<BackendAnomaly>) {
    return fetchAnomalyJson<BackendAnomaly>(`/api/anomalies/${id}`, {
        method: "PUT",
        body: JSON.stringify(anomaly),
    });
}
