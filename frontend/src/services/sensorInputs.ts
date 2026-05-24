export const RAINWATER_TANK_NAME = "Rainwater Tank";

export const SENSOR_INPUT_TAGS = {
    ultrasonicTrig: "ultrasonic_trig",
    ultrasonicEcho: "ultrasonic_echo",
    waterTemperature: "water_temperature_ds18b20",
    ph: "ph_sensor",
    turbidity: "turbidity_sensor",
} as const;

export type SensorInputTag =
    (typeof SENSOR_INPUT_TAGS)[keyof typeof SENSOR_INPUT_TAGS];

export type SensorStatus = "pending" | "online" | "warning" | "offline";

export type SensorInputDefinition = {
    tag: SensorInputTag;
    label: string;
    source: string;
    unit: string;
    value: number | null;
    status: SensorStatus;
    notes: string;
};

export type SensorTelemetryRecord = {
    id: string;
    tank: typeof RAINWATER_TANK_NAME;
    timestamp: string | null;
    sensorStatus: SensorStatus;
    ultrasonicWaterLevelPercent: number | null;
    ph: number | null;
    turbidityNtu: number | null;
    waterTemperatureC: number | null;
    tags: SensorInputTag[];
};

export const sensorInputDefinitions: SensorInputDefinition[] = [
    {
        tag: SENSOR_INPUT_TAGS.ultrasonicTrig,
        label: "Ultrasonic TRIG",
        source: "ESP32 GPIO output",
        unit: "pulse",
        value: null,
        status: "pending",
        notes: "Trigger pulse input for water level calculation.",
    },
    {
        tag: SENSOR_INPUT_TAGS.ultrasonicEcho,
        label: "Ultrasonic ECHO",
        source: "ESP32 GPIO input",
        unit: "microseconds",
        value: null,
        status: "pending",
        notes: "Echo pulse duration used to calculate water level.",
    },
    {
        tag: SENSOR_INPUT_TAGS.waterTemperature,
        label: "Water Temperature",
        source: "DS18B20",
        unit: "C",
        value: null,
        status: "pending",
        notes: "Water temperature input from the DS18B20 sensor.",
    },
    {
        tag: SENSOR_INPUT_TAGS.ph,
        label: "pH",
        source: "pH sensor",
        unit: "pH",
        value: null,
        status: "pending",
        notes: "Water quality pH input.",
    },
    {
        tag: SENSOR_INPUT_TAGS.turbidity,
        label: "Turbidity",
        source: "Turbidity sensor",
        unit: "NTU",
        value: null,
        status: "pending",
        notes: "Water clarity input for trend and anomaly detection.",
    },
];

export const placeholderTelemetryRecord: SensorTelemetryRecord = {
    id: "pending-live-telemetry",
    tank: RAINWATER_TANK_NAME,
    timestamp: null,
    sensorStatus: "pending",
    ultrasonicWaterLevelPercent: null,
    ph: null,
    turbidityNtu: null,
    waterTemperatureC: null,
    tags: [
        SENSOR_INPUT_TAGS.ph,
        SENSOR_INPUT_TAGS.turbidity,
        SENSOR_INPUT_TAGS.waterTemperature,
        SENSOR_INPUT_TAGS.ultrasonicTrig,
        SENSOR_INPUT_TAGS.ultrasonicEcho,
    ],
};

export const telemetryInputRows: SensorTelemetryRecord[] = [
    placeholderTelemetryRecord,
];

export function getSensorDefinition(tag: SensorInputTag) {
    return sensorInputDefinitions.find((sensor) => sensor.tag === tag);
}

export function formatNullableValue(value: number | null, unit = "") {
    if (value === null || Number.isNaN(value)) return "--";
    return unit ? `${value} ${unit}` : String(value);
}

export function getInputSourceSummary(tags: SensorInputTag[]) {
    return tags
        .map((tag) => getSensorDefinition(tag)?.tag ?? tag)
        .join(", ");
}

