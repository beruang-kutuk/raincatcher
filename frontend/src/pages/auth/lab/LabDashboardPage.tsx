import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BrainCircuit, CheckCircle2, CloudRain, Droplets, ExternalLink, RefreshCw, ThermometerSun, Wind } from "lucide-react";
import "../../../styles/dashboard.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import RpiCameraFeed from "../../../components/lab/RpiCameraFeed";
import { getLatestFrameUrl } from "../../../services/cameraMlApi";
import {
    getLatestAnalysisRecord,
    getLatestCameraRecord,
    getLatestYoloRecord,
    type CameraRecord,
} from "../../../services/cameraRecordsApi";
import {
    getLatestTelemetry,
    type IotTelemetryReading,
} from "../../../services/iotTelemetryApi";
import {
    getAnomalySummary,
    type BackendAnomaly,
} from "../../../services/anomalyApi";
import {
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    type NotificationAlert,
} from "../../../services/notificationApi";
import {
    getWaterAdvisor,
    recordWaterAdvisorAction,
    type AiAdvisorResponse,
} from "../../../services/aiApi";
import {
    getCurrentWeather,
    getDailyForecastSeries,
    type WeatherRecord,
} from "../../../services/weatherApi";
import { buildBackendUrl } from "../../../services/apiConfig";
import {
    RAINWATER_TANK_NAME,
    SENSOR_INPUT_TAGS,
} from "../../../services/sensorInputs";
import {
    formatCurrentDateTime,
    getProjectionDays,
} from "../../../services/time";
import { getStatusColor, getRainfallStatusColor, RAINFALL_LEGEND } from "../../../utils/statusColors";

type StatCardData = {
    title: string;
    value: string;
    subValue?: string;
    status?: "normal" | "flagged" | "warning";
    inputTag: string;
};

type AnomalyItem = {
    id: number;
    title: string;
    message: string;
    severity: "low" | "medium" | "high";
    time: string;
};

const TELEMETRY_POLL_MS = 5000;

function formatDateLabel(dateStr: string | null | undefined): string {
    if (!dateStr) return "?";
    try {
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    } catch {
        return "?";
    }
}

function getSeverityClass(severity: string | null | undefined) {
    switch (severity) {
        case "high": return "severity-high";
        case "medium": return "severity-medium";
        default: return "severity-low";
    }
}

function formatTelemetryValue(value: number | undefined, unit = "", decimals = 2) {
    if (value === undefined || value === null || Number.isNaN(value)) return "--";
    return `${value.toFixed(decimals)} ${unit}`.trim();
}

function formatWeatherRainfall(value: number | null | undefined) {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.0 mm";
    return `${value.toFixed(1)} mm`;
}

function formatWeatherWind(value: number | null | undefined) {
    if (typeof value !== "number" || Number.isNaN(value)) return "Unavailable";
    return `${value.toFixed(1)} km/h`;
}

function formatWeatherValue(value: number | null | undefined, unit: string, decimals = 0) {
    if (typeof value !== "number" || Number.isNaN(value)) return `-- ${unit}`;
    return `${value.toFixed(decimals)} ${unit}`;
}

function formatReadableStatus(value: string | null | undefined) {
    if (!value) return "--";
    return value
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDashboardAnomaly(row: BackendAnomaly): AnomalyItem {
    return {
        id: row.id ?? Date.now(),
        title: row.title ?? "Anomaly",
        message: row.description ?? "Anomaly details unavailable.",
        severity: row.severity === "high" || row.severity === "medium" ? row.severity : "low",
        time: row.createdAt ?? "--",
    };
}

function StatCard({ title, value, subValue, status = "warning", inputTag }: StatCardData) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <p className="stat-title">{title}</p>
            </div>
            <h3 className="stat-value">{value}</h3>
            {subValue && <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>{subValue}</p>}
            <div className="stat-card-status">
                <span className={`status-pill status-${status}`}>{inputTag}</span>
            </div>
        </div>
    );
}

function DashboardRainfallChart({ data }: { data: Array<{ day: string; rain: number | null }> }) {
    const numericValues = data.map((d) => d.rain).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    if (numericValues.length === 0) {
        return (
            <div className="empty-state compact">
                <strong>No 7-day rainfall forecast yet</strong>
                <span>Chart will load AccuWeather data when the backend is connected.</span>
            </div>
        );
    }

    const svgW = 640;
    const svgH = 200;
    const pL = 38;
    const pR = 12;
    const pT = 14;
    const pB = 42;
    const chartW = svgW - pL - pR;
    const chartH = svgH - pT - pB;
    const maxVal = Math.max(10, ...numericValues);
    const ticks = [0, maxVal * 0.5, maxVal];
    const barSlotW = chartW / data.length;
    const barW = Math.max(8, barSlotW * 0.55);

    return (
        <div className="mini-chart-wrap">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mini-chart-svg" preserveAspectRatio="none">
                {ticks.map((tick) => {
                    const y = svgH - pB - (tick / maxVal) * chartH;
                    return (
                        <g key={tick}>
                            <line x1={pL} y1={y} x2={svgW - pR} y2={y} className="mini-chart-grid-line" />
                            <text x={pL - 4} y={y + 4} className="mini-chart-axis-text" textAnchor="end">
                                {Math.round(tick)}
                            </text>
                        </g>
                    );
                })}
                {data.map((item, index) => {
                    const val = typeof item.rain === "number" ? item.rain : 0;
                    const barH = maxVal > 0 ? (val / maxVal) * chartH : 0;
                    const xCenter = pL + (index + 0.5) * barSlotW;
                    const color = getRainfallStatusColor(val);
                    const barTop = svgH - pB - Math.max(barH, 1);
                    return (
                        <g key={item.day}>
                            <rect
                                x={xCenter - barW / 2}
                                y={barTop}
                                width={barW}
                                height={Math.max(barH, 1)}
                                rx="3"
                                fill={color}
                                opacity="0.88"
                            />
                            {val > 0 && (
                                <text
                                    x={xCenter}
                                    y={barTop - 4}
                                    className="mini-chart-axis-text"
                                    textAnchor="middle"
                                    fill={color}
                                    fontSize="9"
                                    fontWeight="700"
                                >
                                    {val.toFixed(1)}
                                </text>
                            )}
                        </g>
                    );
                })}
                <line x1={pL} y1={svgH - pB} x2={svgW - pR} y2={svgH - pB} className="mini-chart-axis-line" />
                {data.map((item, index) => {
                    const x = pL + (index + 0.5) * barSlotW;
                    return (
                        <text key={`lbl-${index}`} x={x} y={svgH - pB + 16}
                            className="mini-chart-axis-text" textAnchor="middle">
                            {item.day}
                        </text>
                    );
                })}
            </svg>
            <div className="mini-chart-legend">
                {RAINFALL_LEGEND.map((item) => (
                    <div key={item.label} className="mini-chart-legend-item">
                        <span className="mini-chart-legend-dot" style={{ background: item.color }} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ForecastList({ data }: { data: Array<{ day: string; storage: number | null }> }) {
    if (data.every((item) => item.storage === null)) {
        return (
            <div className="empty-state compact">
                <strong>No storage forecast yet</strong>
                <span>Projection rows will use ultrasonic water level and weather input.</span>
            </div>
        );
    }

    return (
        <div className="forecast-list">
            {data.map((item) => {
                const pct = item.storage ?? 0;
                const color = getStatusColor(pct);
                return (
                    <div key={item.day} className="forecast-row">
                        <span>{item.day}</span>
                        <div className="forecast-progress">
                            <div
                                className="forecast-progress-fill"
                                style={{ width: `${pct}%`, background: color }}
                            />
                        </div>
                        <span style={{ color, fontWeight: 700 }}>
                            {item.storage === null ? "--" : `${item.storage}%`}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function AiWaterAdvisorCard({
    advisor,
    loading,
    actionLoading,
    actionMessage,
    onRefresh,
    onAction,
}: {
    advisor: AiAdvisorResponse | null;
    loading: boolean;
    actionLoading: string;
    actionMessage: string;
    onRefresh: () => void;
    onAction: (action: string) => void;
}) {
    return (
        <section className="lab-card ai-advisor-card">
            <div className="section-header ai-advisor-header">
                <div>
                    <h2><BrainCircuit size={18} /> AI Water Advisor</h2>
                    <p>{advisor ? `${advisor.source.toUpperCase()} · ${advisor.createdAt}` : "Evidence-based tank recommendation"}</p>
                </div>
                <div className="ai-advisor-header-actions">
                    {advisor && <span className={`severity-badge ${getSeverityClass(advisor.severity)}`}>{advisor.severity}</span>}
                    <button type="button" className="ai-advisor-icon-btn" onClick={onRefresh} disabled={loading} title="Refresh advisor">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {loading && !advisor ? (
                <div className="empty-state compact">
                    <strong>Loading advisor</strong>
                    <span>Collecting telemetry, forecast, anomaly, YOLO, and calibration evidence.</span>
                </div>
            ) : advisor ? (
                <div className="ai-advisor-content">
                    <div className="ai-advisor-summary">
                        <h3>{advisor.title}</h3>
                        <p>{advisor.summary}</p>
                    </div>

                    <div className="ai-evidence-grid">
                        {advisor.evidence.map((item) => (
                            <div key={item.label} className={`ai-evidence-item ai-evidence-${item.status}`}>
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                            </div>
                        ))}
                    </div>

                    <div className="ai-advisor-actions-list">
                        {advisor.recommendedActions.slice(0, 5).map((action) => (
                            <div key={action} className="ai-advisor-action-row">
                                <CheckCircle2 size={15} />
                                <span>{action}</span>
                            </div>
                        ))}
                    </div>

                    <div className="ai-human-action-row">
                        {advisor.humanDecisionOptions.map((action) => (
                            <button
                                key={action}
                                type="button"
                                className="ai-human-action-btn"
                                disabled={actionLoading !== ""}
                                onClick={() => onAction(action)}
                            >
                                {actionLoading === action ? <RefreshCw size={14} /> : <CheckCircle2 size={14} />}
                                <span>{action}</span>
                            </button>
                        ))}
                    </div>

                    {actionMessage && <div className="ai-advisor-feedback">{actionMessage}</div>}
                </div>
            ) : (
                <div className="empty-state compact">
                    <strong>Advisor unavailable</strong>
                    <span>Rule-based fallback will appear when the backend responds.</span>
                </div>
            )}
        </section>
    );
}

export default function LabDashboardPage() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notificationOpen, setNotificationOpen] = useState(false);

    // Camera ML
    const [cameraAnalysis, setCameraAnalysis] = useState<CameraRecord | null>(null);
    const [latestCameraRecord, setLatestCameraRecord] = useState<CameraRecord | null>(null);
    const [cameraMlLoading, setCameraMlLoading] = useState(false);
    const [cameraMlError, setCameraMlError] = useState("");

    // YOLO (compact status only)
    const [yoloResult, setYoloResult] = useState<CameraRecord | null>(null);
    const [yoloLoading, setYoloLoading] = useState(false);
    const [yoloError, setYoloError] = useState("");

    // ESP32 telemetry
    const [latestTelemetry, setLatestTelemetry] = useState<IotTelemetryReading | null>(null);
    const [telemetryLoading, setTelemetryLoading] = useState(false);
    const [telemetryError, setTelemetryError] = useState("");
    const [weather, setWeather] = useState<WeatherRecord | null>(null);
    const [weatherError, setWeatherError] = useState("");
    const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
    const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [notificationMarkingAll, setNotificationMarkingAll] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [advisor, setAdvisor] = useState<AiAdvisorResponse | null>(null);
    const [advisorLoading, setAdvisorLoading] = useState(false);
    const [advisorActionLoading, setAdvisorActionLoading] = useState("");
    const [advisorActionMessage, setAdvisorActionMessage] = useState("");
    const [rainfallSeriesData, setRainfallSeriesData] = useState<Array<{ day: string; rain: number | null }>>([]);
    const [storageForecastRows, setStorageForecastRows] = useState<Array<{ day: string; storage: number | null }>>([]);

    const now = formatCurrentDateTime();

    async function loadNotifications() {
        try {
            const [alertRows, count] = await Promise.all([
                getNotifications(),
                getUnreadNotificationCount(),
            ]);
            setNotifications(alertRows);
            setUnreadNotificationCount(count.count ?? 0);
            setNotificationError("");
        } catch {
            setNotifications([]);
            setUnreadNotificationCount(0);
        }
    }

    async function loadAdvisor(showLoading = true) {
        if (showLoading) setAdvisorLoading(true);
        setAdvisorActionMessage("");
        try {
            const response = await getWaterAdvisor();
            setAdvisor(response);
        } catch {
            setAdvisor(null);
        } finally {
            if (showLoading) setAdvisorLoading(false);
        }
    }

    async function handleNotificationClick(item: NotificationAlert) {
        if (item.id) {
            try {
                await markNotificationRead(item.id);
                await loadNotifications();
            } catch {
                // Keep dropdown usable even if the read marker fails.
            }
        }
        setNotificationOpen(false);
        navigate(item.linkPath || "/lab/anomalies");
    }

    async function handleReadAllNotifications() {
        if (unreadNotificationCount === 0 || notificationMarkingAll) return;
        setNotificationMarkingAll(true);
        setNotificationError("");
        try {
            const result = await markAllNotificationsRead();
            const now = new Date().toISOString();
            setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || now })));
            setUnreadNotificationCount(result.count ?? 0);
        } catch (error) {
            setNotificationError(error instanceof Error ? error.message : "Notifications could not be marked read.");
        } finally {
            setNotificationMarkingAll(false);
        }
    }

    async function handleAdvisorAction(action: string) {
        setAdvisorActionLoading(action);
        setAdvisorActionMessage("");
        try {
            await recordWaterAdvisorAction({
                action,
                user: localStorage.getItem("rc_display_name") || "lab",
            });
            setAdvisorActionMessage(`${action} recorded.`);
            await loadAdvisor(false);
        } catch {
            setAdvisorActionMessage("Action could not be recorded.");
        } finally {
            setAdvisorActionLoading("");
        }
    }

    useEffect(() => {
        let active = true;

        async function loadCameraMlStatus() {
            setCameraMlLoading(true);
            setCameraMlError("");
            try {
                const [latestRecord, analysis] = await Promise.all([
                    getLatestCameraRecord(),
                    getLatestAnalysisRecord(),
                ]);
                if (!active) return;
                setLatestCameraRecord(latestRecord);
                setCameraAnalysis(analysis);
            } catch {
                if (!active) return;
                setCameraAnalysis(null);
                setCameraMlError("Camera records unavailable");
            } finally {
                if (active) setCameraMlLoading(false);
            }
        }

        async function loadTelemetry(showLoading = false) {
            if (showLoading) setTelemetryLoading(true);
            setTelemetryError("");
            try {
                const reading = await getLatestTelemetry();
                if (!active) return;
                setLatestTelemetry(reading);
            } catch {
                if (!active) return;
                setLatestTelemetry(null);
                setTelemetryError("ESP32 telemetry unavailable");
            } finally {
                if (active && showLoading) setTelemetryLoading(false);
            }
        }

        async function loadYoloStatus() {
            setYoloLoading(true);
            try {
                const result = await getLatestYoloRecord();
                if (!active) return;
                setYoloResult(result);
            } catch {
                if (!active) return;
                setYoloError("YOLO unavailable");
            } finally {
                if (active) setYoloLoading(false);
            }
        }

        async function loadWeatherAndRainfall() {
            setWeatherError("");

            // 1. Fetch multi-day series (always needed for chart; also used as weather fallback)
            let series: import("../../../services/weatherApi").DailyForecastDay[] = [];
            try {
                series = await getDailyForecastSeries();
            } catch { /* ignore — handled below */ }
            if (!active) return;

            // Populate rainfall chart from series
            if (series.length > 0) {
                setRainfallSeriesData(
                    series.map((d, i) => ({
                        day: formatDateLabel(d.date) || `D${i + 1}`,
                        rain: typeof d.rainfallAmount === "number" ? d.rainfallAmount : 0,
                    }))
                );
            }

            // 2. Try current weather; on failure fall back to first daily forecast entry
            try {
                const record = await getCurrentWeather();
                if (!active) return;
                setWeather(record);
            } catch {
                if (!active) return;
                if (series.length > 0) {
                    const first = series[0];
                    setWeather({
                        location: first.location ?? "Shah Alam",
                        recordType: "daily-forecast",
                        temperature: first.temperature ?? null,
                        humidity: null,
                        rainfallAmount: typeof first.rainfallAmount === "number" ? first.rainfallAmount : 0,
                        rainfallProbability: first.rainfallProbability ?? null,
                        windSpeed: null,
                        weatherCondition: first.weatherCondition ?? null,
                        source: "AccuWeather (daily forecast)",
                        providerRecordedAt: first.date ?? null,
                        recordedAt: first.date ?? null,
                    });
                    setWeatherError("");
                } else {
                    setWeather(null);
                    setWeatherError("Weather unavailable — check AccuWeather API key on Raspberry Pi");
                }
            }
        }

        async function loadAnomalySummary() {
            try {
                const summary = await getAnomalySummary();
                if (!active) return;
                setAnomalies((summary.recent ?? []).map(toDashboardAnomaly));
            } catch {
                if (!active) return;
                setAnomalies([]);
            }
        }

        async function loadStorageForecast() {
            try {
                const response = await fetch(buildBackendUrl("/api/forecast/tank-storage"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                });
                if (!response.ok || !active) return;
                const result = await response.json() as {
                    dailyProjection?: Array<{ levelPercent?: number }>;
                };
                const projection = result.dailyProjection;
                if (!Array.isArray(projection) || projection.length === 0) return;
                const days = getProjectionDays(projection.length);
                setStorageForecastRows(
                    projection.map((pt, i) => ({
                        day: days[i]?.day ?? `Day ${i + 1}`,
                        storage: typeof pt.levelPercent === "number" ? Math.round(pt.levelPercent) : null,
                    }))
                );
            } catch {
                // Keep empty — shows "No storage forecast yet" which is accurate when API fails
            }
        }

        void loadCameraMlStatus();
        void loadTelemetry(true);
        void loadYoloStatus();
        void loadWeatherAndRainfall();
        void loadAnomalySummary();
        void loadStorageForecast();
        void loadNotifications();
        void loadAdvisor(true);
        const handleNotificationsUpdated = () => {
            void loadNotifications();
        };
        globalThis.window?.addEventListener("raincatcher:notifications-updated", handleNotificationsUpdated);
        const telemetryIntervalId = globalThis.setInterval(() => {
            void loadTelemetry(false);
            void loadAnomalySummary();
            void loadNotifications();
        }, TELEMETRY_POLL_MS);

        return () => {
            active = false;
            globalThis.window?.removeEventListener("raincatcher:notifications-updated", handleNotificationsUpdated);
            globalThis.clearInterval(telemetryIntervalId);
        };
    }, []);

    const stats: StatCardData[] = useMemo(() => {
        const t = latestTelemetry;

        if (telemetryLoading) {
            return [
                { title: "pH", value: "Loading...", status: "warning", inputTag: SENSOR_INPUT_TAGS.ph },
                { title: "Turbidity", value: "Loading...", status: "warning", inputTag: SENSOR_INPUT_TAGS.turbidity },
                { title: "Water Temperature", value: "Loading...", status: "warning", inputTag: SENSOR_INPUT_TAGS.waterTemperature },
                { title: "Tank Level", value: "Loading...", status: "warning", inputTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}` },
            ];
        }

        if (telemetryError || !t) {
            const valueText = telemetryError ? "ESP32 telemetry unavailable." : "Waiting for ESP32 telemetry...";
            return [
                { title: "pH", value: valueText, status: "warning", inputTag: SENSOR_INPUT_TAGS.ph },
                { title: "Turbidity", value: valueText, status: "warning", inputTag: SENSOR_INPUT_TAGS.turbidity },
                { title: "Water Temperature", value: valueText, status: "warning", inputTag: SENSOR_INPUT_TAGS.waterTemperature },
                { title: "Tank Level", value: valueText, status: "warning", inputTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}` },
            ];
        }

        return [
            {
                title: "pH",
                value: formatTelemetryValue(t.ph, "pH"),
                status: t.ph >= 6.5 && t.ph <= 8.5 ? "normal" : "flagged",
                inputTag: SENSOR_INPUT_TAGS.ph,
            },
            {
                title: "Turbidity",
                value: formatTelemetryValue(t.turbidity, "NTU"),
                status: t.turbidity <= 100 ? "normal" : "flagged",
                inputTag: SENSOR_INPUT_TAGS.turbidity,
            },
            {
                title: "Water Temperature",
                value: formatTelemetryValue(t.waterTemperature, "°C"),
                status: "normal",
                inputTag: SENSOR_INPUT_TAGS.waterTemperature,
            },
            {
                title: "Tank Level",
                value: formatTelemetryValue(t.waterLevelPercent, "%", 1),
                subValue: `Distance: ${formatTelemetryValue(t.ultrasonicDistanceCm, "cm", 1)}`,
                status: t.waterLevelPercent >= 20 ? "normal" : "flagged",
                inputTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}`,
            },
        ];
    }, [latestTelemetry, telemetryLoading, telemetryError]);

    const forecastData = storageForecastRows.length > 0
        ? storageForecastRows
        : getProjectionDays(7).map((item) => ({ day: item.day, storage: null as null }));

    const cameraMlOnline = Boolean(cameraAnalysis && !cameraMlError);
    const cameraMlSeverityClass = cameraAnalysis?.severity === "high"
        ? "status-high"
        : cameraAnalysis?.severity === "medium"
            ? "status-medium"
            : "status-low";

    const yolo = yoloResult;
    const cameraRecordSummary = latestCameraRecord
        ? `Latest saved record: ${latestCameraRecord.recordType ?? "camera"}`
        : "Live feed connected. No saved camera records yet.";

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="lab-dashboard-page page-container">
                        <div className="dashboard-main">
                            <div className="dashboard-topbar">
                                <div>
                                    <h1 className="dashboard-title">Raincatcher Lab Dashboard</h1>
                                </div>

                                <div className="dashboard-actions">
                                    <div className="notification-wrapper">
                                        <button type="button" className="notification-btn"
                                            onClick={() => setNotificationOpen((prev) => !prev)} aria-label="View alerts">
                                            <Bell size={18} />
                                            {unreadNotificationCount > 0 && (
                                                <span className="notification-dot">{unreadNotificationCount}</span>
                                            )}
                                        </button>

                                        {notificationOpen && (
                                            <div className="notification-dropdown">
                                                <div className="notification-header">
                                                    <div>
                                                        <h3>Notifications</h3>
                                                        <span>{unreadNotificationCount} unread</span>
                                                    </div>
                                                    {notifications.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="notification-read-all"
                                                            onClick={() => void handleReadAllNotifications()}
                                                            disabled={unreadNotificationCount === 0 || notificationMarkingAll}
                                                        >
                                                            {notificationMarkingAll ? "Marking..." : "Mark all read"}
                                                        </button>
                                                    )}
                                                </div>
                                                {notificationError && (
                                                    <div className="notification-error" role="alert">
                                                        {notificationError}
                                                    </div>
                                                )}

                                                {notifications.length === 0 ? (
                                                    <div className="empty-state compact">
                                                        <strong>No notifications</strong>
                                                        <span>New sensor, camera, and anomaly alerts will appear here.</span>
                                                    </div>
                                                ) : (
                                                    <div className="notification-list">
                                                        {notifications.slice(0, 8).map((item) => (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                className={`notification-item ${item.readAt ? "read" : "unread"}`}
                                                                onClick={() => void handleNotificationClick(item)}
                                                            >
                                                                <div className={`notification-alert-dot ${getSeverityClass(item.severity)}`} />
                                                                <div>
                                                                    <div className="notification-item-top">
                                                                        <strong>{item.title}</strong>
                                                                        <span className={`severity-badge ${getSeverityClass(item.severity)}`}>{item.severity}</span>
                                                                    </div>
                                                                    <p>{item.message}</p>
                                                                    <span className="notification-time">
                                                                        {item.createdAt ?? "--"} <ExternalLink size={11} />
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <button type="button" className="notification-view-all"
                                                    onClick={() => { setNotificationOpen(false); navigate("/lab/anomalies"); }}>
                                                    View all anomalies
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <ProfileMenu />
                                </div>
                            </div>

                            <div className="weather-card">
                                <div className="weather-main">
                                    <div className="weather-icon"><CloudRain size={26} /></div>
                                    <div>
                                        <p className="weather-label">Current Weather — {weather?.location ?? "Shah Alam"}</p>
                                        <h2>
                                            {weather?.weatherCondition ?? (weatherError || "Waiting for weather data")}
                                            {weather?.temperature != null && ` · ${weather.temperature.toFixed(1)} °C`}
                                        </h2>
                                        <span>
                                            {weather
                                                ? `${weather.source ?? "AccuWeather"} · Last updated ${weather.recordedAt ?? weather.providerRecordedAt ?? now}`
                                                : weatherError || `Last refreshed ${now}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="weather-stats">
                                    <div><Droplets size={18} /><span>Rainfall</span><strong>{formatWeatherRainfall(weather?.rainfallAmount)}</strong></div>
                                    <div><Wind size={18} /><span>Wind</span><strong>{formatWeatherWind(weather?.windSpeed)}</strong></div>
                                    <div><ThermometerSun size={18} /><span>Humidity</span><strong>{formatWeatherValue(weather?.humidity, "%")}</strong></div>
                                </div>
                            </div>

                            <div className="stats-grid">
                                {stats.map((item) => <StatCard key={item.title} {...item} />)}
                            </div>

                            <AiWaterAdvisorCard
                                advisor={advisor}
                                loading={advisorLoading}
                                actionLoading={advisorActionLoading}
                                actionMessage={advisorActionMessage}
                                onRefresh={() => void loadAdvisor(true)}
                                onAction={(action) => void handleAdvisorAction(action)}
                            />

                            <div className="dashboard-grid two-columns">
                                <section className="lab-card">
                                    <div className="section-header">
                                        <div>
                                            <h2>7-Day Rainfall Forecast</h2>
                                            <p>Predicted rainfall for the next 7 days.</p>
                                        </div>
                                    </div>
                                    <DashboardRainfallChart data={rainfallSeriesData} />
                                </section>

                                <section className="lab-card">
                                    <div className="section-header">
                                        <div>
                                            <h2>Storage Forecast</h2>
                                            <p>Prepared for {RAINWATER_TANK_NAME} ultrasonic level input</p>
                                        </div>
                                    </div>
                                    <ForecastList data={forecastData} />
                                </section>
                            </div>

                            <div className="dashboard-grid two-columns">
                                <section className="lab-card">
                                    <div className="section-header">
                                        <div>
                                            <h2>Anomalies & Status</h2>
                                            <p>Review warnings after anomaly detection runs</p>
                                        </div>
                                    </div>

                                    {anomalies.length === 0 ? (
                                        <div className="empty-state compact">
                                            <strong>No active anomalies</strong>
                                            <span>Sensor or camera anomalies will appear here after rules are connected.</span>
                                        </div>
                                    ) : (
                                        <div className="anomaly-list">
                                            {anomalies.map((item) => (
                                                <div key={item.id} className="anomaly-item">
                                                    <div className="anomaly-top">
                                                        <h3>{item.title}</h3>
                                                        <span className={`severity-badge ${getSeverityClass(item.severity)}`}>{item.severity}</span>
                                                    </div>
                                                    <p>{item.message}</p>
                                                    <span className="anomaly-time">{item.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <section className="lab-card">
                                    <div className="section-header">
                                        <div>
                                            <h2>{RAINWATER_TANK_NAME} Camera</h2>
                                            <p>Raspberry Pi webcam stream for current lab inspection</p>
                                        </div>
                                    </div>

                                    <div className="image-placeholder">
                                        <RpiCameraFeed
                                            frameClassName="dashboard-camera-frame"
                                            imageClassName="image-preview"
                                            overlayLabel="Live Feed"
                                            sourceLabel="Raspberry Pi camera ML latest frame"
                                            srcUrl={getLatestFrameUrl()}
                                            refreshMs={5000}
                                        />

                                        {/* Basic Camera ML status */}
                                        <div className="dashboard-camera-ml-status">
                                            <div className="dashboard-camera-ml-row">
                                                <span>Camera ML</span>
                                                <strong className={cameraMlOnline ? "connected" : "unavailable"}>
                                                    {cameraMlLoading ? "Checking" : cameraMlOnline ? "Saved" : "No saved analysis"}
                                                </strong>
                                            </div>

                                            {cameraMlError ? (
                                                <p>Camera records unavailable.</p>
                                            ) : (
                                                <>
                                                    <div className="dashboard-camera-ml-row">
                                                        <span>Last analysis</span>
                                                        <strong>{cameraAnalysis?.createdAt ?? "--"}</strong>
                                                    </div>
                                                    <div className="dashboard-camera-ml-row">
                                                        <span>Severity</span>
                                                        <strong className={`status-pill ${cameraMlSeverityClass}`}>
                                                            {cameraAnalysis?.severity ?? "pending"}
                                                        </strong>
                                                    </div>
                                                    <p>
                                                        {cameraAnalysis?.aiRecommendation
                                                            ?? cameraRecordSummary}
                                                    </p>
                                                </>
                                            )}

                                            {/* Compact YOLO status — does not affect Camera ML state */}
                                            <div className="dashboard-camera-ml-row" style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                                                <span>YOLO Detection</span>
                                                <strong className={yolo ? "connected" : "unavailable"}>
                                                    {yoloLoading ? "Running" : yolo ? "Completed" : yoloError ? "Unavailable" : "Not run"}
                                                </strong>
                                            </div>

                                            {yolo ? (
                                                <>
                                                    <div className="dashboard-camera-ml-row">
                                                        <span>Model</span>
                                                        <strong>{yolo.yoloModel ?? "--"}</strong>
                                                    </div>
                                                    <div className="dashboard-camera-ml-row">
                                                        <span>Visual Status</span>
                                                        <strong>{formatReadableStatus(yolo.visualStatus)}</strong>
                                                    </div>
                                                    <div className="dashboard-camera-ml-row">
                                                        <span>Detections</span>
                                                        <strong>{yolo.detectionCount ?? "--"}</strong>
                                                    </div>
                                                    <div className="dashboard-camera-ml-row">
                                                        <span>Severity</span>
                                                        <strong className={`status-pill status-${yolo.severity === "high" ? "high" : yolo.severity === "medium" ? "medium" : "low"}`}>
                                                            {yolo.severity}
                                                        </strong>
                                                    </div>
                                                    <p style={{ fontSize: "12px", marginTop: "4px" }}>{yolo.aiRecommendation}</p>
                                                </>
                                            ) : (
                                                <p style={{ fontSize: "12px", color: "var(--muted)" }}>
                                                    {yoloError ? "Live feed connected. YOLO unavailable." : "Live feed connected. No saved YOLO record yet."}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
