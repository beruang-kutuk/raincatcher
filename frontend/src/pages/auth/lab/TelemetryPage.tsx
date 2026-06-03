import { useEffect, useMemo, useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/telemetry.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import {
    getLatestTelemetry,
    getTelemetryHistory,
    getTelemetryStatus,
    type IotTelemetryStatus,
    type IotTelemetryReading,
} from "../../../services/iotTelemetryApi";
import {
    RAINWATER_TANK_NAME,
    SENSOR_INPUT_TAGS,
} from "../../../services/sensorInputs";
import {
    formatCurrentDate,
} from "../../../services/time";

type TelemetryCard = {
    label: string;
    value: string;
    unit: string;
    status: "normal" | "warning" | "flagged";
    sourceTag: string;
};

function getCardStatusClass(status: "normal" | "warning" | "flagged") {
    if (status === "warning") return "status-warning";
    if (status === "flagged") return "status-flagged";
    return "status-normal";
}

function TelemetryMetricCard({ label, value, unit, status, sourceTag }: TelemetryCard) {
    return (
        <div className="telemetry-metric-card">
            <div className="telemetry-metric-top">
                <div className="telemetry-metric-text">
                    <p className="telemetry-metric-label">{label}</p>
                    <div className="telemetry-metric-value-row">
                        <h3 className="telemetry-metric-value">{value}</h3>
                        <span className="telemetry-metric-unit">{unit}</span>
                    </div>
                    <span className={`telemetry-inline-status ${getCardStatusClass(status)}`}>
                        {sourceTag}
                    </span>
                </div>
            </div>
        </div>
    );
}

function TrendChart({ values }: { values: number[] }) {
    const width = 520;
    const height = 220;
    const padding = 24;

    if (values.length < 2) {
        return (
            <div className="telemetry-chart-shell telemetry-chart-empty">
                <div className="empty-state compact">
                    <strong>No turbidity history yet.</strong>
                    <span>The graph will render after readings arrive from {SENSOR_INPUT_TAGS.turbidity}.</span>
                </div>
            </div>
        );
    }

    const min = 0;
    const max = Math.max(6, ...values);
    const points = values.map((value, index) => {
        const x = padding + (index * (width - padding * 2)) / (values.length - 1);
        const y = height - padding - ((value - min) / (max - min)) * (height - padding * 2);
        return `${x},${y}`;
    });

    const polylinePoints = points.join(" ");
    const areaPoints = [`${padding},${height - padding}`, ...points, `${width - padding},${height - padding}`].join(" ");

    return (
        <div className="telemetry-chart-shell">
            <svg viewBox={`0 0 ${width} ${height}`} className="telemetry-chart-svg" preserveAspectRatio="none">
                {[0, max * 0.25, max * 0.5, max * 0.75, max].map((tick) => {
                    const y = height - padding - ((tick - min) / (max - min)) * (height - padding * 2);
                    return (
                        <line key={tick} x1={padding} y1={y} x2={width - padding} y2={y} className="telemetry-grid-line" />
                    );
                })}
                <polygon points={areaPoints} className="telemetry-area-fill" />
                <polyline points={polylinePoints} className="telemetry-line" />
                {points.map((point, index) => {
                    const [cx, cy] = point.split(",").map(Number);
                    return <circle key={index} cx={cx} cy={cy} r="4" className="telemetry-point" />;
                })}
            </svg>
        </div>
    );
}

function formatReading(value: number | undefined, decimals = 2) {
    if (value === undefined || value === null) return "--";
    return value.toFixed(decimals);
}

const TELEMETRY_POLL_MS = 5000;

export default function TelemetryPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [latestTelemetry, setLatestTelemetry] = useState<IotTelemetryReading | null>(null);
    const [historyRows, setHistoryRows] = useState<IotTelemetryReading[]>([]);
    const [telemetryStatus, setTelemetryStatus] = useState<IotTelemetryStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const currentDate = formatCurrentDate();
    useEffect(() => {
        let active = true;

        async function loadTelemetry(showLoading = false) {
            if (showLoading) setLoading(true);
            setError("");
            try {
                const [latest, history, statusResult] = await Promise.allSettled([
                    getLatestTelemetry(),
                    getTelemetryHistory(),
                    getTelemetryStatus(),
                ]);
                if (!active) return;

                if (latest.status === "fulfilled") setLatestTelemetry(latest.value);
                if (history.status === "fulfilled") setHistoryRows(history.value);
                if (statusResult.status === "fulfilled") setTelemetryStatus(statusResult.value);

                if (latest.status === "rejected" && history.status === "rejected") {
                    setError("ESP32 telemetry unavailable");
                }
            } catch {
                if (!active) return;
                setError("ESP32 telemetry unavailable");
            } finally {
                if (active && showLoading) setLoading(false);
            }
        }

        void loadTelemetry(true);
        const telemetryIntervalId = globalThis.setInterval(() => {
            void loadTelemetry(false);
        }, TELEMETRY_POLL_MS);

        return () => {
            active = false;
            globalThis.clearInterval(telemetryIntervalId);
        };
    }, []);

    const telemetryCards: TelemetryCard[] = useMemo(() => {
        const t = latestTelemetry;

        if (loading) {
            return [
                { label: "pH", value: "Loading ESP32 telemetry...", unit: "", status: "warning", sourceTag: SENSOR_INPUT_TAGS.ph },
                { label: "Turbidity", value: "Loading ESP32 telemetry...", unit: "", status: "warning", sourceTag: SENSOR_INPUT_TAGS.turbidity },
                { label: "Water Temperature", value: "Loading ESP32 telemetry...", unit: "", status: "warning", sourceTag: SENSOR_INPUT_TAGS.waterTemperature },
                { label: "Ultrasonic Water Level", value: "Loading ESP32 telemetry...", unit: "", status: "warning", sourceTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}` },
            ];
        }

        if (!t) {
            const v = error ? "ESP32 telemetry unavailable." : "Waiting for ESP32 telemetry...";
            return [
                { label: "pH", value: v, unit: "", status: "warning", sourceTag: SENSOR_INPUT_TAGS.ph },
                { label: "Turbidity", value: v, unit: "", status: "warning", sourceTag: SENSOR_INPUT_TAGS.turbidity },
                { label: "Water Temperature", value: v, unit: "", status: "warning", sourceTag: SENSOR_INPUT_TAGS.waterTemperature },
                { label: "Ultrasonic Water Level", value: v, unit: "", status: "warning", sourceTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}` },
            ];
        }

        return [
            { label: "pH", value: formatReading(t.ph), unit: "pH", status: t.ph >= 6.5 && t.ph <= 8.5 ? "normal" : "flagged", sourceTag: SENSOR_INPUT_TAGS.ph },
            { label: "Turbidity", value: formatReading(t.turbidity, 1), unit: "NTU", status: t.turbidity <= 100 ? "normal" : "flagged", sourceTag: SENSOR_INPUT_TAGS.turbidity },
            { label: "Water Temperature", value: formatReading(t.waterTemperature), unit: "°C", status: "normal", sourceTag: SENSOR_INPUT_TAGS.waterTemperature },
            { label: "Ultrasonic Water Level", value: formatReading(t.waterLevelPercent, 1), unit: "%", status: t.waterLevelPercent >= 20 ? "normal" : "flagged", sourceTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}` },
        ];
    }, [latestTelemetry, loading, error]);

    const turbidityTrend = useMemo(
        () => historyRows.map((row) => row.turbidity).filter((v): v is number => typeof v === "number"),
        [historyRows],
    );

    const displayRows = historyRows;

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="telemetry-page page-container">
                        <div className="telemetry-topbar">
                            <div>
                                <h1 className="telemetry-page-title">Telemetry</h1>
                            </div>
                            <div className="telemetry-topbar-right">
                                <button className="telemetry-filter-btn" type="button">{currentDate}</button>
                                <button className="telemetry-filter-btn" type="button">{RAINWATER_TANK_NAME}</button>
                                <div className="dashboard-actions"><ProfileMenu /></div>
                            </div>
                        </div>

                        <div className="telemetry-metric-grid">
                            {telemetryCards.map((card) => <TelemetryMetricCard key={card.label} {...card} />)}
                        </div>

                        <div className="telemetry-content-grid">
                            <section className="telemetry-panel telemetry-feed-panel">
                                <div className="telemetry-panel-header">
                                    <h2>Live Telemetry Feed</h2>
                                </div>

                                <div className="telemetry-table-wrap">
                                    <table className="telemetry-table">
                                        <thead>
                                            <tr>
                                                <th>Timestamp</th>
                                                <th>pH</th>
                                                <th>Turbidity (NTU)</th>
                                                <th>Temp (°C)</th>
                                                <th>Water Level (%)</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                                                        {loading
                                                            ? "Loading ESP32 telemetry..."
                                                            : error
                                                                ? "ESP32 telemetry unavailable."
                                                                : "Waiting for ESP32 telemetry..."}
                                                    </td>
                                                </tr>
                                            ) : (
                                                displayRows.map((row, idx) => (
                                                    <tr key={row.timestamp ?? idx}>
                                                        <td>
                                                            <div className="telemetry-time-cell">
                                                                <span>{row.timestamp ?? "--"}</span>
                                                                <span className="telemetry-live-badge">received</span>
                                                            </div>
                                                        </td>
                                                        <td>{formatReading(row.ph)}</td>
                                                        <td>{formatReading(row.turbidity, 1)}</td>
                                                        <td>{formatReading(row.waterTemperature)}</td>
                                                        <td>{formatReading(row.waterLevelPercent, 1)}</td>
                                                        <td>
                                                    <span className="telemetry-dot-status online" />
                                                            <span className="sr-only">received</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="telemetry-panel telemetry-trend-panel">
                                <div className="telemetry-panel-header telemetry-panel-header-split">
                                    <h2>Turbidity Trend</h2>
                                    <button className="telemetry-filter-btn small" type="button">
                                        {SENSOR_INPUT_TAGS.turbidity}
                                    </button>
                                </div>
                                <TrendChart values={turbidityTrend} />
                            </section>
                        </div>

                        <section className="telemetry-bottom-strip">
                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Data Source</p>
                                <h3>ESP32 RC-01 — {RAINWATER_TANK_NAME}</h3>
                            </div>
                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Last Updated</p>
                                <h3>{latestTelemetry?.timestamp ?? "--"}</h3>
                            </div>
                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Connection Status</p>
                                <h3 className={
                                    telemetryStatus?.status === "ONLINE"
                                        ? "connected"
                                        : telemetryStatus?.status === "STALE"
                                            ? "stale"
                                            : error
                                                ? "unavailable"
                                                : "connected"
                                }>
                                    {loading
                                        ? "Connecting..."
                                        : telemetryStatus?.status === "ONLINE"
                                            ? "Online"
                                            : telemetryStatus?.status === "STALE"
                                                ? "Stale"
                                                : error
                                                    ? "Unavailable"
                                                    : "Awaiting ESP32 input"}
                                </h3>
                                {telemetryStatus?.secondsSinceLastReading !== null && telemetryStatus?.secondsSinceLastReading !== undefined && (
                                    <p className="telemetry-strip-meta">
                                        Last reading {telemetryStatus.secondsSinceLastReading}s ago
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
