import { RAINWATER_TANK_NAME, SENSOR_INPUT_TAGS } from "./sensorInputs";
import { formatCurrentDateTime, formatDateRange } from "./time";

export type QuickReportId =
    | "daily-summary"
    | "weekly-performance"
    | "forecast-benchmark"
    | "anomaly-report";

export type GeneratedReportRow = {
    id: string;
    name: string;
    type: string;
    tanks: typeof RAINWATER_TANK_NAME;
    range: string;
    generatedOn: string;
    size: string;
    sourceTags: string[];
};

export type QuickReportDefinition = {
    id: QuickReportId;
    title: string;
    description: string;
};

export const generatedReportRows: GeneratedReportRow[] = [];

export const quickReportDefinitions: QuickReportDefinition[] = [
    {
        id: "daily-summary",
        title: "Daily Summary",
        description: "Open today's telemetry and camera summary view.",
    },
    {
        id: "weekly-performance",
        title: "Weekly Performance",
        description: "Open weekly storage and water quality performance.",
    },
    {
        id: "forecast-benchmark",
        title: "Forecast Benchmark",
        description: "Open forecast-versus-observed benchmark view.",
    },
    {
        id: "anomaly-report",
        title: "Anomaly Report",
        description: "Open anomaly review and resolution summary.",
    },
];

export const reportInputTags = [
    SENSOR_INPUT_TAGS.ultrasonicTrig,
    SENSOR_INPUT_TAGS.ultrasonicEcho,
    SENSOR_INPUT_TAGS.waterTemperature,
    SENSOR_INPUT_TAGS.ph,
    SENSOR_INPUT_TAGS.turbidity,
];

export function getReportPlaceholderTitle(id: QuickReportId) {
    return quickReportDefinitions.find((item) => item.id === id)?.title ?? "Report";
}

export function createPendingReportRow(type: string): GeneratedReportRow {
    return {
        id: "pending-report",
        name: type,
        type,
        tanks: RAINWATER_TANK_NAME,
        range: formatDateRange(7),
        generatedOn: formatCurrentDateTime(),
        size: "Pending backend generation",
        sourceTags: reportInputTags,
    };
}

