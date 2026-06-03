import { buildBackendUrl } from "./apiConfig";

const REAL_ESP32_DEVICE_ID = "RC-01";

export type IotTelemetryReading = {
    id?: number;
    deviceId: string;
    tankId: string;
    ph: number;
    turbidity: number;
    waterTemperature: number;
    ultrasonicDistanceCm: number;
    waterLevelPercent: number;
    timestamp?: string;
    status?: string;
};

export type IotTelemetryStatus = {
    deviceId: string | null;
    lastSeen: string | null;
    status: "ONLINE" | "STALE" | "OFFLINE" | string;
    secondsSinceLastReading: number | null;
};

type IotTelemetryWaitingResponse = {
    status: "waiting";
    message: string;
};

type LatestTelemetryResponse = IotTelemetryReading | IotTelemetryWaitingResponse;

async function fetchIotJson<T>(path: string): Promise<T> {
    const response = await fetch(buildBackendUrl(path));
    if (!response.ok) {
        throw new Error(`IoT backend request failed with status ${response.status}: ${path}`);
    }
    return (await response.json()) as T;
}

function isRealEsp32Telemetry(reading: IotTelemetryReading | LatestTelemetryResponse | null | undefined): reading is IotTelemetryReading {
    return Boolean(reading && "deviceId" in reading && reading.deviceId === REAL_ESP32_DEVICE_ID);
}

export async function getLatestTelemetry(): Promise<IotTelemetryReading | null> {
    const latest = await fetchIotJson<LatestTelemetryResponse>("/api/iot/telemetry/latest");
    if (isRealEsp32Telemetry(latest)) return latest;

    const history = await getTelemetryHistory();
    return history[0] ?? null;
}

export async function getTelemetryHistory(): Promise<IotTelemetryReading[]> {
    const history = await fetchIotJson<IotTelemetryReading[]>("/api/iot/telemetry/history");
    return history.filter(isRealEsp32Telemetry);
}

export async function getTelemetryStatus(): Promise<IotTelemetryStatus> {
    return fetchIotJson<IotTelemetryStatus>("/api/iot/telemetry/status");
}
