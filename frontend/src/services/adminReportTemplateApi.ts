import { buildBackendUrl } from "./apiConfig";

export type AdminReportTemplate = {
    id: number;
    name: string;
    description: string;
    sectionsJson: string;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
};

export type AdminReportTemplatePayload = Partial<Pick<AdminReportTemplate, "name" | "description" | "sectionsJson" | "enabled">>;

async function reportTemplateJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) throw new Error(`Admin report template request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getAdminReportTemplates() {
    return reportTemplateJson<AdminReportTemplate[]>("/api/admin/report-templates");
}

export function createAdminReportTemplate(payload: AdminReportTemplatePayload) {
    return reportTemplateJson<AdminReportTemplate>("/api/admin/report-templates", { method: "POST", body: JSON.stringify(payload) });
}

export function updateAdminReportTemplate(id: number, payload: AdminReportTemplatePayload) {
    return reportTemplateJson<AdminReportTemplate>(`/api/admin/report-templates/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteAdminReportTemplate(id: number) {
    return reportTemplateJson<{ status: string }>(`/api/admin/report-templates/${id}`, { method: "DELETE" });
}
