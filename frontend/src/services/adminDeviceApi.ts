import { buildBackendUrl } from "./apiConfig";

export type AdminDevice = {
    id: number;
    name: string;
    category: string;
    status: "Online" | "Offline" | "Pending" | "Warning" | string;
    lastSeen: string;
    lastData: string;
    inputTag?: string | null;
    maintenanceMode?: boolean;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type AdminDevicePayload = Partial<Omit<AdminDevice, "id" | "createdAt" | "updatedAt">>;

async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) throw new Error(`Admin device request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getAdminDevices() {
    return adminJson<AdminDevice[]>("/api/admin/devices");
}

export function getAdminDevice(id: number) {
    return adminJson<AdminDevice>(`/api/admin/devices/${id}`);
}

export function createAdminDevice(payload: AdminDevicePayload) {
    return adminJson<AdminDevice>("/api/admin/devices", { method: "POST", body: JSON.stringify(payload) });
}

export function updateAdminDevice(id: number, payload: AdminDevicePayload) {
    return adminJson<AdminDevice>(`/api/admin/devices/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function updateAdminDeviceStatus(id: number, status: string) {
    return adminJson<AdminDevice>(`/api/admin/devices/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
}

export function markAdminDeviceMaintenance(id: number, notes?: string) {
    return adminJson<AdminDevice>(`/api/admin/devices/${id}/maintenance`, { method: "POST", body: JSON.stringify({ notes }) });
}

export function refreshAdminDevice(id: number) {
    return adminJson<AdminDevice>(`/api/admin/devices/${id}/refresh`, { method: "POST" });
}

export function restartAdminDeviceService(id: number) {
    return adminJson<AdminDevice>(`/api/admin/devices/${id}/restart-service`, { method: "POST" });
}
