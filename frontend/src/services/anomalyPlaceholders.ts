import {
    RAINWATER_TANK_NAME,
    SENSOR_INPUT_TAGS,
    type SensorInputTag,
} from "./sensorInputs";
import { formatCurrentDateTime } from "./time";

export type AnomalySeverity = "high" | "medium" | "low";
export type AnomalyStatus = "unresolved" | "investigating" | "resolved";

export type AnomalyRow = {
    id: number;
    time: string;
    source: string;
    sourceTag: SensorInputTag | "camera_capture" | "manual_observation";
    title: string;
    description: string;
    severity: AnomalySeverity;
    status: AnomalyStatus;
    value: string;
    cameraReference?: string;
    recommendation: {
        status: "placeholder";
        modelInputs: string[];
        message: string;
    };
    resolvedAt?: string;
};

export type ManualAnomalyDraft = {
    title: string;
    description: string;
    severity: AnomalySeverity;
    sourceTag: SensorInputTag | "camera_capture" | "manual_observation";
    timestamp: string;
    cameraReference: string;
};

export const anomalyInputTags = [
    SENSOR_INPUT_TAGS.ultrasonicTrig,
    SENSOR_INPUT_TAGS.ultrasonicEcho,
    SENSOR_INPUT_TAGS.waterTemperature,
    SENSOR_INPUT_TAGS.ph,
    SENSOR_INPUT_TAGS.turbidity,
    "camera_capture",
    "manual_observation",
] as const;

export function createManualAnomalyDraft(): ManualAnomalyDraft {
    return {
        title: "",
        description: "",
        severity: "medium",
        sourceTag: "manual_observation",
        timestamp: formatCurrentDateTime(),
        cameraReference: "",
    };
}

export function toAnomalyRow(draft: ManualAnomalyDraft): AnomalyRow {
    return {
        id: Date.now(),
        time: draft.timestamp || formatCurrentDateTime(),
        source:
            draft.sourceTag === "camera_capture"
                ? `${RAINWATER_TANK_NAME} - Camera`
                : draft.sourceTag === "manual_observation"
                    ? `${RAINWATER_TANK_NAME} - Manual Observation`
                    : `${RAINWATER_TANK_NAME} - ${draft.sourceTag}`,
        sourceTag: draft.sourceTag,
        title: draft.title.trim() || "Manual anomaly",
        description: draft.description.trim() || "Manual anomaly awaiting detailed notes.",
        severity: draft.severity,
        status: "unresolved",
        value: "Pending sensor value",
        cameraReference: draft.cameraReference.trim() || undefined,
        recommendation: {
            status: "placeholder",
            modelInputs: [
                "sensor readings",
                "captured camera images",
                "anomaly descriptions",
                "historical anomaly cases",
            ],
            message:
                "AI recommendation will be generated after anomaly ML service integration.",
        },
    };
}

export const detectedAnomalyRows: AnomalyRow[] = [];
export const resolvedAnomalyRows: AnomalyRow[] = [];

