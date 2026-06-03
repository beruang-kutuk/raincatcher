import { buildBackendUrl } from "./apiConfig";

export type CameraRecord = {
    id?: number;
    tankId?: string | null;
    cameraSource?: string | null;
    recordType?: "capture" | "basic_analysis" | "yolo_detection" | "health" | string | null;
    imageUrl?: string | null;
    yoloFrameUrl?: string | null;
    status?: string | null;
    severity?: string | null;
    brightness?: number | null;
    blurScore?: number | null;
    darkRatio?: number | null;
    brightRatio?: number | null;
    visualStatus?: string | null;
    yoloModel?: string | null;
    detectionCount?: number | null;
    detectionsJson?: string | null;
    aiRecommendation?: string | null;
    futureNote?: string | null;
    createdAt?: string | null;
};

export type CameraRecordHealth = {
    status: string;
    message?: string;
    baseUrl?: string;
    camera?: unknown;
};

async function fetchCameraRecordJson<T>(path: string, method = "GET"): Promise<T | null> {
    const response = await fetch(buildBackendUrl(path), { method });

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        let message = "Raspberry Pi camera service unavailable. Make sure camera_ml_backend.py is running.";
        try {
            const body = await response.json() as { message?: string };
            message = body.message || message;
        } catch {
            // Keep the clean fallback message.
        }
        throw new Error(message);
    }

    return (await response.json()) as T;
}

export function checkCameraRecordHealth() {
    return fetchCameraRecordJson<CameraRecordHealth>("/api/camera-records/health");
}

export function analyseCameraRecord() {
    return fetchCameraRecordJson<CameraRecord>("/api/camera-records/analyse", "POST");
}

export function captureCameraRecord() {
    return fetchCameraRecordJson<CameraRecord>("/api/camera-records/capture", "POST");
}

export function runYoloCameraRecord() {
    return fetchCameraRecordJson<CameraRecord>("/api/camera-records/yolo-detect", "POST");
}

export function getLatestCameraRecord() {
    return fetchCameraRecordJson<CameraRecord>("/api/camera-records/latest");
}

export function getCameraRecordHistory() {
    return fetchCameraRecordJson<CameraRecord[]>("/api/camera-records/history").then((records) => records ?? []);
}

export function getLatestAnalysisRecord() {
    return fetchCameraRecordJson<CameraRecord>("/api/camera-records/latest-analysis");
}

export function getLatestYoloRecord() {
    return fetchCameraRecordJson<CameraRecord>("/api/camera-records/latest-yolo");
}

export function normaliseCameraImageUrl(url: string | null | undefined) {
    if (!url) return "";
    if (url.includes("/api/camera/latest-frame")) return buildBackendUrl("/api/camera-frame/latest");
    if (url.includes("/api/camera/yolo-frame")) return buildBackendUrl("/api/camera-frame/yolo");
    if (url.startsWith("/api/")) return buildBackendUrl(url);
    return url;
}

export function withImageCacheBust(url: string | null | undefined) {
    const normalisedUrl = normaliseCameraImageUrl(url);
    if (!normalisedUrl) return "";
    return `${normalisedUrl}${normalisedUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
}
