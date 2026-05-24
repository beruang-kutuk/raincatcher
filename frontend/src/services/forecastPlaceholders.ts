import {
    RAINWATER_TANK_NAME,
    SENSOR_INPUT_TAGS,
    type SensorInputTag,
} from "./sensorInputs";
import { formatCurrentDateTime, getProjectionDays } from "./time";

export type ForecastModuleId =
    | "benchmark"
    | "monthly-harvest"
    | "risk"
    | "tank-storage"
    | "usable-water"
    | "weekly-harvest"
    | "what-if-scenario"
    | "ai-recommendation";

export type ForecastPlaceholder = {
    id: ForecastModuleId;
    title: string;
    status: "waiting_for_input" | "ready_for_backend";
    tank: typeof RAINWATER_TANK_NAME;
    inputTags: SensorInputTag[];
    generatedAt: string;
    message: string;
};

export const forecastInputTags: SensorInputTag[] = [
    SENSOR_INPUT_TAGS.ultrasonicTrig,
    SENSOR_INPUT_TAGS.ultrasonicEcho,
    SENSOR_INPUT_TAGS.waterTemperature,
    SENSOR_INPUT_TAGS.ph,
    SENSOR_INPUT_TAGS.turbidity,
];

export function getForecastPlaceholders(): ForecastPlaceholder[] {
    const generatedAt = formatCurrentDateTime();

    return [
        {
            id: "benchmark",
            title: "Forecast Benchmark",
            status: "waiting_for_input",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "Benchmark results will appear after forecast and observed telemetry history are connected.",
        },
        {
            id: "monthly-harvest",
            title: "Monthly Harvest",
            status: "waiting_for_input",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "Monthly harvest projection is ready for telemetry and weather inputs.",
        },
        {
            id: "risk",
            title: "Risk Forecast",
            status: "waiting_for_input",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "Risk scoring will use water quality, tank level, weather, and anomaly history.",
        },
        {
            id: "tank-storage",
            title: "Tank Storage",
            status: "waiting_for_input",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "Storage projection awaits real ultrasonic level readings.",
        },
        {
            id: "usable-water",
            title: "Usable Water",
            status: "waiting_for_input",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "Usable-water estimates will combine pH, turbidity, temperature, and tank volume.",
        },
        {
            id: "weekly-harvest",
            title: "Weekly Harvest",
            status: "waiting_for_input",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "Weekly harvest will use weather forecast rainfall and live storage data.",
        },
        {
            id: "what-if-scenario",
            title: "What-if Scenario",
            status: "ready_for_backend",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "Scenario input is available in the frontend and can be sent to a backend model later.",
        },
        {
            id: "ai-recommendation",
            title: "AI Recommendation",
            status: "waiting_for_input",
            tank: RAINWATER_TANK_NAME,
            inputTags: forecastInputTags,
            generatedAt,
            message: "AI recommendations will use telemetry, forecasts, weather API data, and anomaly history.",
        },
    ];
}

export function getEmptyStorageProjection(days = 7) {
    return getProjectionDays(days).map((day, index) => ({
        ...day,
        value: index === 0 ? null : null,
    }));
}

