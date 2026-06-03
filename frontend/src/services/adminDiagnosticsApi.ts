import { buildBackendUrl } from "./apiConfig";

export type AdminDiagnostic = {
    id: number;
    checkName: string;
    status: "normal" | "warning" | "critical" | string;
    detail: string;
    result: string;
    createdAt: string;
};

async function diagnosticsJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) throw new Error(`Admin diagnostics request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getAdminDiagnostics() {
    return diagnosticsJson<AdminDiagnostic[]>("/api/admin/diagnostics");
}

export function runAdminDiagnostics() {
    return diagnosticsJson<AdminDiagnostic[]>("/api/admin/diagnostics/run", { method: "POST", body: JSON.stringify({ requestedBy: "admin", scope: "all" }) });
}

export function getAdminDiagnosticsHistory() {
    return diagnosticsJson<AdminDiagnostic[]>("/api/admin/diagnostics/history");
}
