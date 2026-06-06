import { buildBackendUrl } from "./apiConfig";

export type AiEvidenceItem = {
    label: string;
    value: string;
    status: "normal" | "warning" | "critical" | string;
};

export type AiAdvisorResponse = {
    severity: "normal" | "low" | "medium" | "high" | string;
    title: string;
    summary: string;
    evidence: AiEvidenceItem[];
    recommendedActions: string[];
    humanDecisionOptions: string[];
    source: "gpt" | "fallback" | string;
    createdAt: string;
};

export type AiAdvisorActionRequest = {
    action: string;
    note?: string;
    user?: string;
};

export type AiAdvisorAction = {
    id: number;
    action: string;
    note?: string | null;
    userName?: string | null;
    createdAt: string;
};

export type AiReportSummaryResponse = {
    severity: "normal" | "low" | "medium" | "high" | string;
    title: string;
    summary: string;
    evidence: AiEvidenceItem[];
    highlights: string[];
    recommendedActions: string[];
    source: "gpt" | "fallback" | string;
    createdAt: string;
};

async function aiJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(buildBackendUrl(path), {
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        ...init,
    });
    if (!response.ok) {
        throw new Error(`AI request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export function getWaterAdvisor() {
    return aiJson<AiAdvisorResponse>("/api/ai/water-advisor");
}

export function recordWaterAdvisorAction(payload: AiAdvisorActionRequest) {
    return aiJson<AiAdvisorAction>("/api/ai/water-advisor/actions", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function getReportAiSummary() {
    return aiJson<AiReportSummaryResponse>("/api/ai/report-summary");
}
