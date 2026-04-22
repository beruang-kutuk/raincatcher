import { useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/forecast.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type ForecastMetric = {
    label: string;
    value: string;
    meta?: string;
    status?: "normal" | "warning" | "flagged";
};

type StorageProjection = {
    day: string;
    date: string;
    value: number;
};

type InsightItem = {
    title: string;
    description: string;
};

type RecommendationItem = {
    title: string;
    description: string;
};

const forecastMetrics: ForecastMetric[] = [
    {
        label: "Total Rainfall (Next 7 Days)",
        value: "48.6 mm",
        meta: "15% vs last 7 days",
        status: "normal",
    },
    {
        label: "Peak Daily Rainfall",
        value: "18.2 mm",
        meta: "Friday, 16 May",
        status: "normal",
    },
    {
        label: "Storage Level (7 Days)",
        value: "78%",
        meta: "8% vs today",
        status: "normal",
    },
    {
        label: "Risk Level",
        value: "Moderate",
        meta: "Monitor closely",
        status: "warning",
    },
];

const rainfallTrend = [5, 4, 6, 5.5, 11, 17.5, 14.5];

const rainfallLabels = [
    "10 May\nSat",
    "11 May\nSun",
    "12 May\nMon",
    "13 May\nTue",
    "14 May\nWed",
    "15 May\nThu",
    "16 May\nFri",
];

const storageProjection: StorageProjection[] = [
    { day: "Today", date: "21 Apr", value: 78 },
    { day: "Tomorrow", date: "22 Apr", value: 75 },
    { day: "Wed", date: "23 Apr", value: 72 },
    { day: "Thu", date: "24 Apr", value: 70 },
    { day: "Fri", date: "25 Apr", value: 68 },
    { day: "Sat", date: "26 Apr", value: 66 },
    { day: "Sun", date: "27 Apr", value: 64 },
];

const insights: InsightItem[] = [
    {
        title: "Above-average rainfall",
        description: "15% more rainfall expected compared to last 7 days.",
    },
    {
        title: "Peak on 15 May",
        description: "Highest daily rainfall of 18.2 mm expected.",
    },
    {
        title: "Storage stays healthy",
        description: "Levels remain above 70% throughout the period.",
    },
];

const recommendations: RecommendationItem[] = [
    {
        title: "No immediate action required",
        description: "Storage levels are within safe range.",
    },
    {
        title: "Continue monitoring forecast updates",
        description: "Especially around 15-16 May.",
    },
    {
        title: "Review water usage plans",
        description: "If rainfall is lower than predicted.",
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

    const min = 0;
    const max = 25;

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

    const uncertaintyTop = points
        .map((p, i) => {
            const extra = [3, 2.8, 4, 4.5, 4.5, 5, 4.2][i];
            return `${p.x},${Math.max(p.y - extra * 6, paddingTop)}`;
        })
        .join(" ");

    const uncertaintyBottom = [...points]
        .reverse()
        .map((p, i) => {
            const idx = points.length - 1 - i;
            const extra = [3, 2.8, 4, 4.5, 4.5, 5, 4.2][idx];
            return `${p.x},${Math.min(p.y + extra * 6, height - paddingBottom)}`;
        })
        .join(" ");

    const uncertaintyPolygon = `${uncertaintyTop} ${uncertaintyBottom}`;

    const ticks = [0, 5, 10, 15, 20, 25];

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
                                {tick}
                            </text>
                        </g>
                    );
                })}

                <polygon points={uncertaintyPolygon} className="forecast-uncertainty-fill" />
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
                {labels.map((label) => {
                    const [line1, line2] = label.split("\n");
                    return (
                        <div key={label} className="forecast-chart-label">
                            <span>{line1}</span>
                            <span>{line2}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ForecastPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

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
                                    21 Apr 2026
                                </button>

                                <button className="forecast-filter-btn" type="button">
                                    All Sensors
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
                                        Daily
                                    </button>
                                </div>

                                <div className="forecast-legend">
                                    <div className="forecast-legend-item">
                                        <span className="forecast-legend-dot forecast-legend-dot-line" />
                                        <span>Predicted Rainfall (mm)</span>
                                    </div>

                                    <div className="forecast-legend-item">
                                        <span className="forecast-legend-dot forecast-legend-dot-range" />
                                        <span>Uncertainty Range</span>
                                    </div>
                                </div>

                                <RainfallForecastChart values={rainfallTrend} labels={rainfallLabels} />

                                <div className="forecast-info-note">
                                    Forecast updates every 6 hours using the latest weather data.
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
                                                        style={{ width: `${item.value}%` }}
                                                    />
                                                </div>

                                                <div className="forecast-storage-value">{item.value}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="forecast-panel">
                                    <div className="forecast-panel-header">
                                        <h2>Recommendations</h2>
                                    </div>

                                    <div className="forecast-recommendation-list">
                                        {recommendations.map((item) => (
                                            <div key={item.title} className="forecast-recommendation-item">
                                                <div>
                                                    <h3>{item.title}</h3>
                                                    <p>{item.description}</p>
                                                </div>
                                                <span className="forecast-arrow">›</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <section className="forecast-panel forecast-insights-panel">
                            <div className="forecast-panel-header">
                                <h2>Key Insights</h2>
                            </div>

                            <div className="forecast-insights-grid">
                                {insights.map((item) => (
                                    <div key={item.title} className="forecast-insight-item">
                                        <h3>{item.title}</h3>
                                        <p>{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}