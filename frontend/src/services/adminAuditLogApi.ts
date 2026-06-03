import { buildBackendUrl } from "./apiConfig";

export type AdminAuditLog = {
    id: number;
    event: string;
    actor: string;
    target: string;
    status: "normal" | "warning" | "critical" | string;
    details: string;
    createdAt: string;
};

export type AdminAuditLogPayload = Partial<Pick<AdminAuditLog, "event" | "actor" | "target" | "status" | "details">>;

async function auditJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) throw new Error(`Admin audit log request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getAdminAuditLogs() {
    return auditJson<AdminAuditLog[]>("/api/admin/audit-logs");
}

export function createAdminAuditLog(payload: AdminAuditLogPayload) {
    return auditJson<AdminAuditLog>("/api/admin/audit-logs", { method: "POST", body: JSON.stringify(payload) });
}

export function clearAdminAuditLogs() {
    return auditJson<{ status: string }>("/api/admin/audit-logs/clear", { method: "DELETE" });
}
