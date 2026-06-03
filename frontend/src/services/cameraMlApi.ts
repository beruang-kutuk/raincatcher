import { buildBackendUrl } from "./apiConfig";

export const CAMERA_ML_BASE_URL = import.meta.env.VITE_RPI_CAMERA_BASE_URL?.trim() || "";

const CAMERA_ML_TIMEOUT_MS = 6500;

export type CameraMlMetrics = {
    blur_score: number;
    bright_ratio: number;
    brightness: number;
    dark_ratio: number;
};

export type CameraMlAnalysisResponse = {
    ai_recommendation: string;
    camera_source: string;
    future_ml_note?: string;
    metrics: CameraMlMetrics;
    severity: "low" | "medium" | "high" | string;
    status: "normal" | "blocked_or_unusable" | "overexposed" | "too_dark" | "blurry" | string;
    tank: string;
    timestamp: string;
};

export type CameraHealthResponse = {
    status: "online" | "offline" | "ok" | "healthy" | string;
    camera_source?: string;
    service?: string;
    tank?: string;
    timestamp?: string;
    message?: string;
};

export type CameraCaptureResponse = {
    status?: "success" | "ok" | "captured" | "error" | string;
    message?: string;
    filename?: string;
    filepath?: string;
    saved_path?: string;
    tank?: string;
    timestamp?: string;
    analysis?: CameraMlAnalysisResponse;
    image_url?: string;
    imageUrl?: string;
    latest_frame_url?: string;
};

function buildCameraUrl(path: string) {
    if (!CAMERA_ML_BASE_URL) {
        throw new Error("Direct Raspberry Pi camera URL is not configured. Use the Spring Boot camera records API.");
    }
    return `${CAMERA_ML_BASE_URL}${path}`;
}

async function fetchCameraJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), CAMERA_ML_TIMEOUT_MS);

    try {
        const response = await fetch(buildCameraUrl(path), {
            method: "GET",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Camera ML request failed with ${response.status}`);
        }

        return (await response.json()) as T;
    } finally {
        globalThis.clearTimeout(timeoutId);
    }
}

export function getCameraHealth() {
    return fetchCameraJson<CameraHealthResponse>("/api/camera/health");
}

export function getCameraAnalysis() {
    return fetchCameraJson<CameraMlAnalysisResponse>("/api/camera/analyse");
}

export async function captureCameraImage(): Promise<CameraCaptureResponse> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), CAMERA_ML_TIMEOUT_MS);

    try {
        const response = await fetch(buildCameraUrl("/api/camera/capture"), {
            method: "GET",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Camera capture failed with ${response.status}`);
        }

        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
            return (await response.json()) as CameraCaptureResponse;
        }

        if (contentType.startsWith("image/")) {
            const imageBlob = await response.blob();
            return {
                status: "success",
                message: "Image captured from Raspberry Pi camera.",
                imageUrl: URL.createObjectURL(imageBlob),
                timestamp: new Date().toISOString(),
            };
        }

        return {
            status: "success",
            message: "Capture request completed.",
            latest_frame_url: getLatestFrameUrl(true),
            timestamp: new Date().toISOString(),
        };
    } finally {
        globalThis.clearTimeout(timeoutId);
    }
}

export function getLatestFrameUrl(cacheBust = false) {
    const url = buildBackendUrl("/api/camera-frame/latest");
    return cacheBust ? `${url}?t=${Date.now()}` : url;
}

export type YoloDetectionBox = [number, number, number, number];

export type YoloDetection = {
    label: string;
    confidence: number;
    box: YoloDetectionBox;
};

export type YoloResult = {
    tank: string;
    timestamp: string;
    model: string;
    visual_status: string;
    severity: "low" | "medium" | "high" | string;
    detections: YoloDetection[];
    detection_count: number;
    ai_recommendation: string;
    future_training_note?: string;
};

export type YoloDetectionResponse = {
    camera_source: string;
    tank: string;
    timestamp: string;
    basic_analysis: CameraMlAnalysisResponse;
    yolo: YoloResult;
};

export function getYoloDetection() {
    return fetchCameraJson<YoloDetectionResponse>("/api/camera/yolo-detect");
}

export function getYoloFrameUrl(cacheBust = false) {
    const url = buildBackendUrl("/api/camera-frame/yolo");
    return cacheBust ? `${url}?t=${Date.now()}` : url;
}
