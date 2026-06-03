import { buildBackendUrl } from "./apiConfig";

export type AdminThreshold = {
    id: number;
    thresholdKey: string;
    label: string;
    value: string;
    unit: string;
    severity: string;
    helper: string;
    updatedAt: string;
};

async function thresholdJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) throw new Error(`Admin threshold request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getAdminThresholds() {
    return thresholdJson<AdminThreshold[]>("/api/admin/thresholds");
}

export function saveAdminThresholds(values: Record<string, string>) {
    return thresholdJson<AdminThreshold[]>("/api/admin/thresholds", { method: "PUT", body: JSON.stringify({ values }) });
}

export function resetAdminThresholds() {
    return thresholdJson<AdminThreshold[]>("/api/admin/thresholds/reset", { method: "POST" });
}
