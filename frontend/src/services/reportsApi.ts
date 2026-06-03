import { buildBackendUrl } from "./apiConfig";

export type ReportRecord = {
    id: number;
    reportType: string;
    tankId: string;
    dateRange: string;
    status: string;
    sectionsJson?: string | null;
    summaryJson?: string | null;
    createdAt: string;
};

export type ReportSummary = {
    generatedReportCount?: number;
    telemetryStatus?: string;
    waterLevelPercent?: number;
    rainfallAmount?: number;
    rainfallProbability?: number;
    [key: string]: unknown;
};

async function fetchReportJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(buildBackendUrl(path), {
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        ...init,
    });
    if (!response.ok) {
        throw new Error(`Reports request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export function getReportSummary() {
    return fetchReportJson<ReportSummary>("/api/reports/summary");
}

export function generateReport(payload: {
    reportType: string;
    tankId: string;
    dateRange: string;
    selectedSections: string[];
}) {
    return fetchReportJson<ReportRecord>("/api/reports/generate", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function getReportHistory() {
    return fetchReportJson<ReportRecord[]>("/api/reports/history");
}
