import { useMemo, useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/telemetry.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import {
    RAINWATER_TANK_NAME,
    SENSOR_INPUT_TAGS,
    formatNullableValue,
    getInputSourceSummary,
    telemetryInputRows,
    type SensorStatus,
} from "../../../services/sensorInputs";
import {
    formatCurrentDate,
    formatCurrentDateTime,
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

function mapSensorStatus(status: SensorStatus): "normal" | "warning" | "flagged" {
    if (status === "online") return "normal";
    if (status === "offline") return "flagged";
    return "warning";
}

function TelemetryMetricCard({
    label,
    value,
    unit,
    status,
    sourceTag,
}: TelemetryCard) {
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
                    <strong>No turbidity history yet</strong>
                    <span>
                        The graph will render after readings arrive from {SENSOR_INPUT_TAGS.turbidity}.
                    </span>
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

    const areaPoints = [
        `${padding},${height - padding}`,
        ...points,
        `${width - padding},${height - padding}`,
    ].join(" ");

    return (
        <div className="telemetry-chart-shell">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="telemetry-chart-svg"
                preserveAspectRatio="none"
            >
                {[0, max * 0.25, max * 0.5, max * 0.75, max].map((tick) => {
                    const y =
                        height - padding - ((tick - min) / (max - min)) * (height - padding * 2);
                    return (
                        <line
                            key={tick}
                            x1={padding}
                            y1={y}
                            x2={width - padding}
                            y2={y}
                            className="telemetry-grid-line"
                        />
                    );
                })}

                <polygon points={areaPoints} className="telemetry-area-fill" />
                <polyline points={polylinePoints} className="telemetry-line" />

                {points.map((point, index) => {
                    const [cx, cy] = point.split(",").map(Number);
                    return (
                        <circle
                            key={index}
                            cx={cx}
                            cy={cy}
                            r="4"
                            className="telemetry-point"
                        />
                    );
                })}
            </svg>
        </div>
    );
}

export default function TelemetryPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const currentDate = formatCurrentDate();
    const currentDateTime = formatCurrentDateTime();
    const liveRows = telemetryInputRows;
    const latest = liveRows[0];

    const telemetryCards: TelemetryCard[] = useMemo(() => [
        {
            label: "pH",
            value: formatNullableValue(latest.ph),
            unit: "pH",
            status: mapSensorStatus(latest.sensorStatus),
            sourceTag: SENSOR_INPUT_TAGS.ph,
        },
        {
            label: "Turbidity",
            value: formatNullableValue(latest.turbidityNtu),
            unit: "NTU",
            status: mapSensorStatus(latest.sensorStatus),
            sourceTag: SENSOR_INPUT_TAGS.turbidity,
        },
        {
            label: "Water Temperature",
            value: formatNullableValue(latest.waterTemperatureC),
            unit: "C",
            status: mapSensorStatus(latest.sensorStatus),
            sourceTag: SENSOR_INPUT_TAGS.waterTemperature,
        },
        {
            label: "Ultrasonic Water Level",
            value: formatNullableValue(latest.ultrasonicWaterLevelPercent),
            unit: "%",
            status: mapSensorStatus(latest.sensorStatus),
            sourceTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}`,
        },
    ], [latest]);

    const turbidityTrend = liveRows
        .map((row) => row.turbidityNtu)
        .filter((value): value is number => typeof value === "number");

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="telemetry-page page-container">
                        <div className="telemetry-topbar">
                            <div>
                                <h1 className="telemetry-page-title">Telemetry</h1>
                            </div>

                            <div className="telemetry-topbar-right">
                                <button className="telemetry-filter-btn" type="button">
                                    {currentDate}
                                </button>
                                <button className="telemetry-filter-btn" type="button">
                                    {RAINWATER_TANK_NAME}
                                </button>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>
                        </div>

                        <div className="telemetry-metric-grid">
                            {telemetryCards.map((card) => (
                                <TelemetryMetricCard key={card.label} {...card} />
                            ))}
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
                                                <th>Temp (C)</th>
                                                <th>Water Level (%)</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {liveRows.map((row) => (
                                                <tr key={row.id}>
                                                    <td>
                                                        <div className="telemetry-time-cell">
                                                            <span>{row.timestamp ?? currentDateTime}</span>
                                                            <span className="telemetry-live-badge">INPUT READY</span>
                                                        </div>
                                                    </td>
                                                    <td>{formatNullableValue(row.ph)}</td>
                                                    <td>{formatNullableValue(row.turbidityNtu)}</td>
                                                    <td>{formatNullableValue(row.waterTemperatureC)}</td>
                                                    <td>{formatNullableValue(row.ultrasonicWaterLevelPercent)}</td>
                                                    <td>
                                                        <span className="telemetry-dot-status pending" />
                                                        <span className="sr-only">{row.sensorStatus}</span>
                                                    </td>
                                                </tr>
                                            ))}
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
                                <h3>{getInputSourceSummary(latest.tags)}</h3>
                            </div>

                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Last Updated</p>
                                <h3>{currentDateTime}</h3>
                            </div>

                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Connection Status</p>
                                <h3 className="connected">Awaiting ESP32 input</h3>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}

