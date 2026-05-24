import { useMemo, useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/forecast.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import {
    forecastInputTags,
    getEmptyStorageProjection,
    getForecastPlaceholders,
} from "../../../services/forecastPlaceholders";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import {
    formatCurrentDate,
    formatCurrentDateTime,
} from "../../../services/time";

type ForecastMetric = {
    label: string;
    value: string;
    meta?: string;
    status?: "normal" | "warning" | "flagged";
};

type StorageProjection = {
    day: string;
    date: string;
    value: number | null;
};

const forecastMetrics: ForecastMetric[] = [
    {
        label: "Total Rainfall Forecast",
        value: "--",
        meta: "Awaiting weather forecast input",
        status: "warning",
    },
    {
        label: "Peak Daily Rainfall",
        value: "--",
        meta: "AccuWeather API data later",
        status: "warning",
    },
    {
        label: "Storage Level Forecast",
        value: "--",
        meta: "Awaiting ultrasonic water level",
        status: "warning",
    },
    {
        label: "Risk Level",
        value: "Pending",
        meta: "Requires telemetry and weather",
        status: "warning",
    },
];

function getStatusClass(status?: "normal" | "warning" | "flagged") {
    if (status === "warning") return "status-warning";
    if (status === "flagged") return "status-flagged";
    return "status-normal";
}

function ForecastMetricCard({
    label,
    value,
    meta,
    status = "normal",
}: ForecastMetric) {
    return (
        <div className="forecast-metric-card">
            <p className="forecast-metric-label">{label}</p>
            <h3 className="forecast-metric-value">{value}</h3>

            <div className="forecast-metric-status">
                <span className={`status-pill ${getStatusClass(status)}`}>{status}</span>
            </div>

            {meta && <p className="forecast-metric-meta">{meta}</p>}
        </div>
    );
}

function RainfallForecastChart({
    values,
    labels,
}: {
    values: number[];
    labels: string[];
}) {
    const width = 760;
    const height = 280;
    const paddingLeft = 34;
    const paddingRight = 20;
    const paddingTop = 28;
    const paddingBottom = 42;

    if (values.length < 2) {
        return (
            <div className="forecast-chart-shell">
                <div className="empty-state compact">
                    <strong>No rainfall forecast loaded</strong>
                    <span>Chart data will render from weather forecast input when the backend is connected.</span>
                </div>
            </div>
        );
    }

    const min = 0;
    const max = Math.max(25, ...values);

    const points = values.map((value, index) => {
        const x =
            paddingLeft +
            (index * (width - paddingLeft - paddingRight)) / (values.length - 1);
        const y =
            height -
            paddingBottom -
            ((value - min) / (max - min)) * (height - paddingTop - paddingBottom);

        return { x, y, value };
    });

    const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPoints = [
        `${points[0].x},${height - paddingBottom}`,
        ...points.map((p) => `${p.x},${p.y}`),
        `${points[points.length - 1].x},${height - paddingBottom}`,
    ].join(" ");
    const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];

    return (
        <div className="forecast-chart-shell">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="forecast-chart-svg"
                preserveAspectRatio="none"
            >
                {ticks.map((tick) => {
                    const y =
                        height -
                        paddingBottom -
                        ((tick - min) / (max - min)) * (height - paddingTop - paddingBottom);

                    return (
                        <g key={tick}>
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={width - paddingRight}
                                y2={y}
                                className="forecast-grid-line"
                            />
                            <text x={6} y={y + 4} className="forecast-axis-text">
                                {Math.round(tick)}
                            </text>
                        </g>
                    );
                })}

                <polygon points={areaPoints} className="forecast-area-fill" />
                <polyline points={linePoints} className="forecast-line" />

                {points.map((p, index) => (
                    <circle
                        key={index}
                        cx={p.x}
                        cy={p.y}
                        r="4.5"
                        className="forecast-point"
                    />
                ))}
            </svg>

            <div className="forecast-chart-labels">
                {labels.map((label) => (
                    <div key={label} className="forecast-chart-label">
                        <span>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ForecastPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const generatedAt = formatCurrentDateTime();
    const storageProjection = useMemo<StorageProjection[]>(() => getEmptyStorageProjection(7), []);
    const forecastModules = useMemo(() => getForecastPlaceholders(), []);
    const aiRecommendation = forecastModules.find((item) => item.id === "ai-recommendation");
    const rainfallTrend: number[] = [];
    const rainfallLabels = storageProjection.map((item) => item.date);

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="forecast-page page-container">
                        <div className="forecast-topbar">
                            <div>
                                <h1 className="forecast-page-title">Forecast</h1>
                            </div>

                            <div className="forecast-topbar-right">
                                <button className="forecast-filter-btn" type="button">
                                    {formatCurrentDate()}
                                </button>

                                <button className="forecast-filter-btn" type="button">
                                    {RAINWATER_TANK_NAME}
                                </button>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>
                        </div>

                        <div className="forecast-metric-grid">
                            {forecastMetrics.map((item) => (
                                <ForecastMetricCard key={item.label} {...item} />
                            ))}
                        </div>

                        <div className="forecast-main-grid">
                            <section className="forecast-panel forecast-chart-panel">
                                <div className="forecast-panel-header forecast-panel-header-split">
                                    <div>
                                        <h2>Rainfall Forecast</h2>
                                    </div>

                                    <button className="forecast-filter-btn small" type="button">
                                        Weather API pending
                                    </button>
                                </div>

                                <div className="forecast-legend">
                                    <div className="forecast-legend-item">
                                        <span className="forecast-legend-dot forecast-legend-dot-line" />
                                        <span>Predicted Rainfall (mm)</span>
                                    </div>
                                </div>

                                <RainfallForecastChart values={rainfallTrend} labels={rainfallLabels} />

                                <div className="forecast-info-note">
                                    Forecast generated time: {generatedAt}. Data will update when telemetry, weather forecast, and AccuWeather input are connected.
                                </div>
                            </section>

                            <div className="forecast-side-column">
                                <section className="forecast-panel">
                                    <div className="forecast-panel-header">
                                        <h2>Storage Level Projection</h2>
                                    </div>

                                    <div className="forecast-storage-list">
                                        {storageProjection.map((item) => (
                                            <div key={`${item.day}-${item.date}`} className="forecast-storage-row">
                                                <div className="forecast-storage-day">{item.day}</div>
                                                <div className="forecast-storage-date">{item.date}</div>

                                                <div className="forecast-storage-progress">
                                                    <div
                                                        className="forecast-storage-progress-fill"
                                                        style={{ width: `${item.value ?? 0}%` }}
                                                    />
                                                </div>

                                                <div className="forecast-storage-value">
                                                    {item.value === null ? "--" : `${item.value}%`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="forecast-panel">
                                    <div className="forecast-panel-header">
                                        <h2>AI Recommendations</h2>
                                    </div>

                                    <div className="forecast-recommendation-list">
                                        <div className="forecast-recommendation-item">
                                            <div>
                                                <h3>{aiRecommendation?.title ?? "AI Recommendation"}</h3>
                                                <p>
                                                    {aiRecommendation?.message ?? "Recommendation service placeholder is ready."}
                                                </p>
                                                <p>
                                                    Inputs: {forecastInputTags.join(", ")}
                                                </p>
                                            </div>
                                            <span className="forecast-arrow">AI</span>
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

