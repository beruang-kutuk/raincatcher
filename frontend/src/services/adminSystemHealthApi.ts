import { buildBackendUrl } from "./apiConfig";

export type AdminSystemService = {
    id: number;
    serviceKey: string;
    serviceName: string;
    status: string;
    implemented: boolean;
    detail: string;
    checkedAt: string;
};

export type AdminSystemHealthSummary = {
    backendApi: string;
    database: string;
    cameraService: string;
    yoloService: string;
    weatherApi: string;
    forecastApi: string;
    reportGeneration: string;
    esp32Telemetry: string;
    sensorNode: string;
    sensorLastSeenSeconds: number | null;
    sensorLastSeenAt: string | null;
    services: AdminSystemService[];
    [key: string]: unknown;
};

async function healthJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) throw new Error(`Admin health request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getAdminSystemHealth() {
    return healthJson<AdminSystemHealthSummary>("/api/admin/system-health");
}

export function runAdminSystemHealthCheck() {
    return healthJson<AdminSystemService[]>("/api/admin/system-health/check", { method: "POST" });
}

export function getAdminSystemHealthServices() {
    return healthJson<AdminSystemService[]>("/api/admin/system-health/services");
}
