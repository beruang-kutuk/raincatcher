import { buildBackendUrl } from "./apiConfig";

export type AdminForecastSetting = {
    id: number;
    settingKey: string;
    label: string;
    value: string;
    unit: string;
    kind: "input" | "select" | string;
    helper: string;
    updatedAt: string;
};

async function forecastSettingsJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) throw new Error(`Admin forecast settings request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getAdminForecastSettings() {
    return forecastSettingsJson<AdminForecastSetting[]>("/api/admin/forecast-settings");
}

export function saveAdminForecastSettings(values: Record<string, string>) {
    return forecastSettingsJson<AdminForecastSetting[]>("/api/admin/forecast-settings", { method: "PUT", body: JSON.stringify({ values }) });
}

export function resetAdminForecastSettings() {
    return forecastSettingsJson<AdminForecastSetting[]>("/api/admin/forecast-settings/reset", { method: "POST" });
}
