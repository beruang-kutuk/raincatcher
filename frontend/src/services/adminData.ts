import type { UserRole } from "../auth/rbac";
import {
    RAINWATER_TANK_NAME,
    SENSOR_INPUT_TAGS,
} from "./sensorInputs";
import { formatCurrentDateTime } from "./time";

export { RAINWATER_TANK_NAME };

export type ManagedRole = "SUPER_ADMIN" | "LAB_ASSISTANT" | "MAINTENANCE" | "VIEWER";
export type UserAccessStatus = "Active" | "Suspended" | "Pending";
export type DeviceStatus = "Online" | "Offline" | "Pending" | "Warning";
export type AdminStatus = "normal" | "warning" | "critical";

export type PermissionKey =
    | "dashboard"
    | "telemetry"
    | "forecast"
    | "reports"
    | "camera"
    | "anomalies"
    | "thresholdEdit"
    | "deviceManagement"
    | "userManagement"
    | "systemSettings";

export type PermissionDefinition = {
    key: PermissionKey;
    label: string;
    description: string;
};

export type RolePolicy = {
    role: ManagedRole;
    label: string;
    description: string;
    permissions: PermissionKey[];
    status: "Active" | "Planned";
};

export type ManagedUser = {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: ManagedRole;
    status: UserAccessStatus;
    lastLogin: string;
};

export type DeviceRow = {
    id: number;
    name: string;
    category: string;
    status: DeviceStatus;
    lastSeen: string;
    lastData: string;
    inputTag?: string;
};

export type HealthMetric = {
    label: string;
    value: string;
    helper: string;
    status: AdminStatus;
    progress?: number;
};

export type ThresholdSetting = {
    id: string;
    label: string;
    value: string;
    unit: string;
    helper: string;
};

export type ForecastSetting = {
    id: string;
    label: string;
    value: string;
    unit?: string;
    kind: "input" | "select";
    options?: string[];
    helper: string;
};

export type ReportSectionSetting = {
    id: string;
    label: string;
    enabled: boolean;
};

export type DiagnosticCard = {
    id: number;
    title: string;
    description: string;
    status: AdminStatus;
};

export type AuditLogRow = {
    id: number;
    event: string;
    actor: string;
    target: string;
    timestamp: string;
    status: AdminStatus;
};

export type AdminPriority = {
    id: number;
    issue: string;
    severity: AdminStatus;
    source: string;
    suggestedAction: string;
    status: "open" | "queued" | "ready";
};

export type SystemEngine = {
    id: number;
    name: string;
    status: AdminStatus;
    lastRun: string;
    inputSource: string;
    nextAction: string;
    health: "ready" | "waiting" | "attention";
};

export const roleLabels: Record<ManagedRole, string> = {
    SUPER_ADMIN: "Super Admin",
    LAB_ASSISTANT: "Lab Assistant",
    MAINTENANCE: "Maintenance",
    VIEWER: "Viewer",
};

export const permissionDefinitions: PermissionDefinition[] = [
    {
        key: "dashboard",
        label: "Dashboard access",
        description: "View current tank overview and monitoring summaries.",
    },
    {
        key: "telemetry",
        label: "Telemetry access",
        description: "View live and historical sensor readings.",
    },
    {
        key: "forecast",
        label: "Forecast access",
        description: "View forecasts and run personal what-if simulations.",
    },
    {
        key: "reports",
        label: "Reports access",
        description: "Generate and view monitoring reports.",
    },
    {
        key: "camera",
        label: "Camera access",
        description: `View the ${RAINWATER_TANK_NAME} camera feed and snapshots.`,
    },
    {
        key: "anomalies",
        label: "Anomaly access",
        description: "Review, acknowledge, and resolve anomaly cases.",
    },
    {
        key: "thresholdEdit",
        label: "Threshold edit",
        description: "Change system-wide alert and anomaly thresholds.",
    },
    {
        key: "deviceManagement",
        label: "Device management",
        description: "Manage Raspberry Pi, ESP32, camera, and sensor status.",
    },
    {
        key: "userManagement",
        label: "User management",
        description: "Add users, assign roles, and suspend accounts.",
    },
    {
        key: "systemSettings",
        label: "System settings",
        description: "Change platform-wide forecast, report, and audit controls.",
    },
];

export const rolePolicies: RolePolicy[] = [
    {
        role: "SUPER_ADMIN",
        label: roleLabels.SUPER_ADMIN,
        description: "Full authority over users, roles, devices, thresholds, reports, forecasts, and audit controls.",
        permissions: permissionDefinitions.map((permission) => permission.key),
        status: "Active",
    },
    {
        role: "LAB_ASSISTANT",
        label: roleLabels.LAB_ASSISTANT,
        description: "Operational monitoring role for dashboard, telemetry, camera, forecasts, anomalies, and reports.",
        permissions: [
            "dashboard",
            "telemetry",
            "forecast",
            "reports",
            "camera",
            "anomalies",
        ],
        status: "Active",
    },
    {
        role: "MAINTENANCE",
        label: roleLabels.MAINTENANCE,
        description: "Hardware support role for device checks, camera troubleshooting, and sensor maintenance.",
        permissions: [
            "dashboard",
            "telemetry",
            "camera",
            "anomalies",
            "deviceManagement",
        ],
        status: "Planned",
    },
    {
        role: "VIEWER",
        label: roleLabels.VIEWER,
        description: "Read-only role for supervisors or external evaluators.",
        permissions: [
            "dashboard",
            "telemetry",
            "forecast",
            "reports",
            "camera",
            "anomalies",
        ],
        status: "Planned",
    },
];

export const profileByUserRole: Record<UserRole, {
    name: string;
    title: string;
    email: string;
    phone: string;
    rolePolicy: ManagedRole;
}> = {
    LAB_ASSISTANT: {
        name: "Jasmine Tan",
        title: "Lab Assistant",
        email: "jasmine@example.com",
        phone: "+60 12-555 0198",
        rolePolicy: "LAB_ASSISTANT",
    },
    SYSTEM_ADMIN: {
        name: "Super Admin",
        title: "Super Administrator",
        email: "admin@raincatcher.local",
        phone: "+60 12-555 0101",
        rolePolicy: "SUPER_ADMIN",
    },
};

export const initialManagedUsers: ManagedUser[] = [
    {
        id: 1,
        name: "Super Admin",
        email: "admin@raincatcher.local",
        phone: "+60 12-555 0101",
        role: "SUPER_ADMIN",
        status: "Active",
        lastLogin: formatCurrentDateTime(),
    },
    {
        id: 2,
        name: "Jasmine Tan",
        email: "jasmine@example.com",
        phone: "+60 12-555 0198",
        role: "LAB_ASSISTANT",
        status: "Active",
        lastLogin: formatCurrentDateTime(),
    },
];

export const deviceRows: DeviceRow[] = [
    {
        id: 1,
        name: "Raspberry Pi 5 Edge Gateway",
        category: "Gateway",
        status: "Online",
        lastSeen: "Live session",
        lastData: "Camera stream configured",
    },
    {
        id: 2,
        name: "USB Webcam",
        category: "Camera",
        status: "Online",
        lastSeen: "Live stream",
        lastData: "Frame stream available",
    },
    {
        id: 3,
        name: "ESP32 Sensor Node",
        category: "Sensor node",
        status: "Pending",
        lastSeen: "Awaiting telemetry",
        lastData: "No packet received",
    },
    {
        id: 4,
        name: "pH Sensor",
        category: "Water quality",
        status: "Pending",
        lastSeen: "Awaiting telemetry",
        lastData: "Input tag ready",
        inputTag: SENSOR_INPUT_TAGS.ph,
    },
    {
        id: 5,
        name: "Turbidity Sensor",
        category: "Water quality",
        status: "Pending",
        lastSeen: "Awaiting telemetry",
        lastData: "Input tag ready",
        inputTag: SENSOR_INPUT_TAGS.turbidity,
    },
    {
        id: 6,
        name: "Ultrasonic TRIG",
        category: "Tank level",
        status: "Pending",
        lastSeen: "Awaiting telemetry",
        lastData: "Input tag ready",
        inputTag: SENSOR_INPUT_TAGS.ultrasonicTrig,
    },
    {
        id: 7,
        name: "Ultrasonic ECHO",
        category: "Tank level",
        status: "Pending",
        lastSeen: "Awaiting telemetry",
        lastData: "Input tag ready",
        inputTag: SENSOR_INPUT_TAGS.ultrasonicEcho,
    },
    {
        id: 8,
        name: "DS18B20 Water Temperature",
        category: "Water quality",
        status: "Pending",
        lastSeen: "Awaiting calibration",
        lastData: "Input tag ready",
        inputTag: SENSOR_INPUT_TAGS.waterTemperature,
    },
];

export const systemHealthMetrics: HealthMetric[] = [
    {
        label: "Raspberry Pi CPU usage",
        value: "Pending live metric",
        helper: "Connect Pi system telemetry to populate CPU load.",
        status: "warning",
        progress: 0,
    },
    {
        label: "Raspberry Pi temperature",
        value: "Pending live metric",
        helper: "Connect Pi system telemetry to populate board temperature.",
        status: "warning",
        progress: 0,
    },
    {
        label: "Memory usage",
        value: "Pending live metric",
        helper: "Connect Pi system telemetry to populate memory usage.",
        status: "warning",
        progress: 0,
    },
    {
        label: "Disk/storage usage",
        value: "Pending live metric",
        helper: "Connect Pi storage telemetry before snapshot retention is enabled.",
        status: "warning",
        progress: 0,
    },
    {
        label: "Camera status",
        value: "Configured",
        helper: "USB webcam stream is configured through environment settings.",
        status: "normal",
    },
    {
        label: "Sensor node status",
        value: "Awaiting ESP32",
        helper: "ESP32 reporting interval and Wi-Fi connection still need live verification.",
        status: "warning",
    },
    {
        label: "Backend API status",
        value: "Placeholder endpoints",
        helper: "Spring Boot endpoints are prepared for real services and persistence.",
        status: "warning",
    },
    {
        label: "Database status",
        value: "Awaiting schema",
        helper: "Audit, users, settings, and sensor readings still need persistence.",
        status: "warning",
    },
];

export const thresholdSettings: ThresholdSetting[] = [
    {
        id: "phMin",
        label: "pH minimum",
        value: "6.5",
        unit: "pH",
        helper: `Input tag: ${SENSOR_INPUT_TAGS.ph}`,
    },
    {
        id: "phMax",
        label: "pH maximum",
        value: "8.5",
        unit: "pH",
        helper: `Input tag: ${SENSOR_INPUT_TAGS.ph}`,
    },
    {
        id: "turbidityWarning",
        label: "Turbidity warning threshold",
        value: "5",
        unit: "NTU",
        helper: `Input tag: ${SENSOR_INPUT_TAGS.turbidity}`,
    },
    {
        id: "tankLow",
        label: "Tank low-level threshold",
        value: "30",
        unit: "%",
        helper: `Input tags: ${SENSOR_INPUT_TAGS.ultrasonicTrig}, ${SENSOR_INPUT_TAGS.ultrasonicEcho}`,
    },
    {
        id: "overflowWarning",
        label: "Overflow warning threshold",
        value: "95",
        unit: "%",
        helper: "Potential overflow alert trigger.",
    },
    {
        id: "temperatureWarning",
        label: "Temperature warning threshold",
        value: "36",
        unit: "C",
        helper: `Input tag: ${SENSOR_INPUT_TAGS.waterTemperature}`,
    },
    {
        id: "sensorTimeout",
        label: "Sensor timeout threshold",
        value: "30",
        unit: "minutes",
        helper: "Marks telemetry as delayed when exceeded.",
    },
];

export const forecastSettings: ForecastSetting[] = [
    {
        id: "tankCapacity",
        label: "Tank capacity",
        value: "100",
        unit: "m3",
        kind: "input",
        helper: `Default capacity for ${RAINWATER_TANK_NAME}.`,
    },
    {
        id: "catchmentArea",
        label: "Catchment area",
        value: "75",
        unit: "m2",
        kind: "input",
        helper: "Roof or catchment surface used in collection estimates.",
    },
    {
        id: "runoffCoefficient",
        label: "Runoff coefficient",
        value: "0.82",
        kind: "input",
        helper: "Efficiency assumption for rainwater capture.",
    },
    {
        id: "dailyUsage",
        label: "Daily water usage",
        value: "8.5",
        unit: "m3/day",
        kind: "input",
        helper: "Default baseline usage for forecasts.",
    },
    {
        id: "forecastPeriod",
        label: "Forecast period",
        value: "30 days",
        kind: "select",
        options: ["7 days", "14 days", "30 days"],
        helper: "Default period used by forecast modules.",
    },
    {
        id: "rainfallSource",
        label: "Rainfall source",
        value: "AccuWeather API later",
        kind: "select",
        options: ["AccuWeather API later", "Manual entry", "Local station"],
        helper: "Weather input source for forecast models.",
    },
    {
        id: "qualityRules",
        label: "Quality factor rules",
        value: "pH and turbidity weighted",
        kind: "select",
        options: ["pH and turbidity weighted", "pH only", "Turbidity only"],
        helper: "Rules that can later modify usable-water projections.",
    },
];

export const reportTemplateSections: ReportSectionSetting[] = [
    { id: "executiveSummary", label: "Executive Summary", enabled: true },
    { id: "telemetrySummary", label: "Telemetry Summary", enabled: true },
    { id: "forecastBenchmark", label: "Forecast vs Actual Benchmark", enabled: true },
    { id: "anomalyHistory", label: "Anomaly History", enabled: true },
    { id: "cameraSnapshots", label: "Camera Snapshots", enabled: true },
    { id: "recommendations", label: "Recommendations", enabled: true },
];

export const diagnosticCards: DiagnosticCard[] = [
    {
        id: 1,
        title: "Camera feed offline",
        description: "Checks USB webcam stream availability and Pi camera service state.",
        status: "warning",
    },
    {
        id: 2,
        title: "Sensor data missing",
        description: "Checks whether telemetry packets have stopped arriving.",
        status: "warning",
    },
    {
        id: 3,
        title: "ESP32 disconnected",
        description: "Checks sensor node connectivity and last packet timestamp.",
        status: "critical",
    },
    {
        id: 4,
        title: "Database/API status",
        description: "Checks backend API and persistence readiness.",
        status: "warning",
    },
    {
        id: 5,
        title: "Forecast service status",
        description: "Checks rainfall forecast source availability.",
        status: "normal",
    },
    {
        id: 6,
        title: "Report generation status",
        description: "Checks whether report preview/export service is available.",
        status: "normal",
    },
];

export const auditLogs: AuditLogRow[] = [
    {
        id: 1,
        event: "User login",
        actor: "Jasmine Tan",
        target: "Lab workspace",
        timestamp: formatCurrentDateTime(),
        status: "normal",
    },
    {
        id: 2,
        event: "Camera accessed",
        actor: "Jasmine Tan",
        target: RAINWATER_TANK_NAME,
        timestamp: formatCurrentDateTime(),
        status: "normal",
    },
];

export const adminPriorities: AdminPriority[] = [
    {
        id: 1,
        issue: "Confirm ESP32 reporting interval",
        severity: "warning",
        source: "ESP32 Sensor Node",
        suggestedAction:
            "Check ESP32 delay/reporting interval, verify Wi-Fi connection, inspect last telemetry timestamp, and restart the telemetry listener if needed.",
        status: "open",
    },
    {
        id: 2,
        issue: "Calibrate DS18B20 water temperature sensor",
        severity: "warning",
        source: SENSOR_INPUT_TAGS.waterTemperature,
        suggestedAction:
            "Verify waterproof probe placement and compare against a trusted thermometer before trusting reports.",
        status: "queued",
    },
    {
        id: 3,
        issue: "Connect persistent storage",
        severity: "normal",
        source: "Backend API",
        suggestedAction:
            "Persist telemetry, camera captures, reports, anomaly cases, audit logs, and settings before production use.",
        status: "ready",
    },
];

export const systemEngines: SystemEngine[] = [
    {
        id: 1,
        name: "Telemetry Engine",
        status: "warning",
        lastRun: "Waiting for ESP32 input",
        inputSource: `${SENSOR_INPUT_TAGS.ph}, ${SENSOR_INPUT_TAGS.turbidity}, ${SENSOR_INPUT_TAGS.waterTemperature}, ultrasonic TRIG/ECHO`,
        nextAction: "Connect listener endpoint and packet parser.",
        health: "waiting",
    },
    {
        id: 2,
        name: "Forecast Engine",
        status: "warning",
        lastRun: "No forecast job run yet",
        inputSource: "Telemetry, weather forecast, AccuWeather API later",
        nextAction: "Wire backend forecast modules to weather and tank data.",
        health: "waiting",
    },
    {
        id: 3,
        name: "Anomaly Detection Engine",
        status: "warning",
        lastRun: "No detection job run yet",
        inputSource: "Sensor thresholds, camera observations, anomaly cases",
        nextAction: "Connect threshold service and anomaly persistence.",
        health: "waiting",
    },
    {
        id: 4,
        name: "AI Recommendation Engine",
        status: "warning",
        lastRun: "No model request sent yet",
        inputSource: "Telemetry, forecast result, images, anomaly descriptions",
        nextAction: "Connect ML recommendation service.",
        health: "waiting",
    },
    {
        id: 5,
        name: "Report Generation Engine",
        status: "normal",
        lastRun: "Frontend preview ready",
        inputSource: "Report templates and pending sensor input structures",
        nextAction: "Connect report persistence and export service.",
        health: "ready",
    },
    {
        id: 6,
        name: "Camera Capture Engine",
        status: "warning",
        lastRun: "Live feed configured",
        inputSource: "Raspberry Pi USB webcam",
        nextAction: "Enable capture endpoint and snapshot storage.",
        health: "attention",
    },
];

export function getPolicyByManagedRole(role: ManagedRole) {
    return rolePolicies.find((policy) => policy.role === role) ?? rolePolicies[1];
}

export function getPermissionLabel(key: PermissionKey) {
    return permissionDefinitions.find((permission) => permission.key === key)?.label ?? key;
}
