import { useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/telemetry.css";
import Sidebar from "../../../components/layout/Sidebar";

type TelemetryCard = {
    label: string;
    value: string;
    unit: string;
    status: "normal" | "warning" | "flagged";
};

type TelemetryRow = {
    time: string;
    turbidity: number;
    temperature: number;
    humidity: number;
    waterLevel: number;
    status: "live" | "normal";
};

const telemetryCards: TelemetryCard[] = [
    { label: "Turbidity", value: "4.2", unit: "NTU", status: "normal" },
    { label: "Temperature", value: "29.0", unit: "°C", status: "normal" },
    { label: "Humidity", value: "71", unit: "%", status: "normal" },
    { label: "Water Level", value: "76", unit: "%", status: "normal" },
];

const telemetryRows: TelemetryRow[] = [
    { time: "10:00:00 AM", turbidity: 4.2, temperature: 29.0, humidity: 71, waterLevel: 76, status: "live" },
    { time: "09:50:00 AM", turbidity: 4.1, temperature: 28.9, humidity: 70, waterLevel: 75, status: "normal" },
    { time: "09:40:00 AM", turbidity: 4.3, temperature: 28.8, humidity: 72, waterLevel: 75, status: "normal" },
    { time: "09:30:00 AM", turbidity: 4.2, temperature: 28.7, humidity: 71, waterLevel: 74, status: "normal" },
    { time: "09:20:00 AM", turbidity: 4.0, temperature: 28.6, humidity: 70, waterLevel: 74, status: "normal" },
    { time: "09:10:00 AM", turbidity: 4.1, temperature: 28.5, humidity: 69, waterLevel: 73, status: "normal" },
];

const trendData = [
    4.2, 3.9, 3.6, 3.4, 3.4, 3.4, 3.7, 4.2, 4.3, 4.8, 4.5, 4.4,
    4.4, 3.8, 3.5, 3.7, 4.2, 3.9, 4.0, 3.7, 3.7, 4.0, 4.2,
];

function getCardStatusClass(status: "normal" | "warning" | "flagged") {
    if (status === "warning") return "status-warning";
    if (status === "flagged") return "status-flagged";
    return "status-normal";
}

function TelemetryMetricCard({
    label,
    value,
    unit,
    status,
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
                        {status}
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

    const min = 0;
    const max = 6;

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
                {[0, 1.5, 3, 4.5, 6].map((tick) => {
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

            <div className="telemetry-chart-labels">
                <span>10:00 AM</span>
                <span>4:00 PM</span>
                <span>10:00 PM</span>
                <span>4:00 AM</span>
                <span>10:00 AM</span>
            </div>
        </div>
    );
}

export default function TelemetryPage() {
    const [profileOpen, setProfileOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

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
                                    21 Apr 2026
                                </button>
                                <button className="telemetry-filter-btn" type="button">
                                    All Sensors
                                </button>

                                <div className="profile-menu-wrapper">
                                    <button
                                        className="profile-avatar-btn"
                                        type="button"
                                        onClick={() => setProfileOpen((prev) => !prev)}
                                    >
                                        <img
                                            src="https://i.pravatar.cc/100?img=12"
                                            alt="User profile"
                                            className="profile-avatar"
                                        />
                                        <span className={`profile-caret ${profileOpen ? "open" : ""}`}>
                                            ⌄
                                        </span>
                                    </button>

                                    {profileOpen && (
                                        <div className="profile-dropdown">
                                            <button className="profile-dropdown-item" type="button">
                                                Settings
                                            </button>
                                            <button className="profile-dropdown-item danger" type="button">
                                                Logout
                                            </button>
                                        </div>
                                    )}
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
                                                <th>Time</th>
                                                <th>Turbidity (NTU)</th>
                                                <th>Temp (°C)</th>
                                                <th>Humidity (%)</th>
                                                <th>Water Level (%)</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetryRows.map((row) => (
                                                <tr key={row.time}>
                                                    <td>
                                                        <div className="telemetry-time-cell">
                                                            <span>{row.time}</span>
                                                            {row.status === "live" && (
                                                                <span className="telemetry-live-badge">LIVE</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{row.turbidity}</td>
                                                    <td>{row.temperature}</td>
                                                    <td>{row.humidity}</td>
                                                    <td>{row.waterLevel}</td>
                                                    <td>
                                                        <span className="telemetry-dot-status" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <button className="telemetry-view-more" type="button">
                                        View More
                                    </button>
                                </div>
                            </section>

                            <section className="telemetry-panel telemetry-trend-panel">
                                <div className="telemetry-panel-header telemetry-panel-header-split">
                                    <h2>Turbidity Trend (Last 24 Hours)</h2>
                                    <button className="telemetry-filter-btn small" type="button">
                                        Turbidity (NTU)
                                    </button>
                                </div>

                                <TrendChart values={trendData} />
                            </section>
                        </div>

                        <section className="telemetry-bottom-strip">
                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Data Source</p>
                                <h3>RC-01 Telemetry Unit</h3>
                            </div>

                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Last Updated</p>
                                <h3>10:00:00 AM, 21 Apr 2026</h3>
                            </div>

                            <div className="telemetry-strip-item">
                                <p className="telemetry-strip-label">Connection Status</p>
                                <h3 className="connected">Connected</h3>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}