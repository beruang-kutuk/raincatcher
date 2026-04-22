import { useState } from "react";
import "../../../styles/dashboard.css";
import tankImage from "../../../assets/images/msu-camera.jpeg";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type StatCardData = {
    title: string;
    value: string;
    status?: "normal" | "flagged" | "warning";
};

type AnomalyItem = {
    id: number;
    title: string;
    message: string;
    severity: "low" | "medium" | "high";
    time: string;
};

const stats: StatCardData[] = [
    {
        title: "Last Telemetry",
        value: "10 mins ago",
        status: "normal",
    },
    {
        title: "Turbidity",
        value: "4.2 NTU",
        status: "normal",
    },
    {
        title: "Cabinet Temp",
        value: "29°C",
        status: "normal",
    },
    {
        title: "Humidity",
        value: "71%",
        status: "normal",
    },
];

const rainfallData = [
    { day: "Mon", rain: 6 },
    { day: "Tue", rain: 12 },
    { day: "Wed", rain: 8 },
    { day: "Thu", rain: 15 },
    { day: "Fri", rain: 4 },
    { day: "Sat", rain: 18 },
    { day: "Sun", rain: 10 },
];

const forecastData = [
    { day: "Day 1", storage: 76 },
    { day: "Day 5", storage: 72 },
    { day: "Day 10", storage: 68 },
    { day: "Day 15", storage: 74 },
    { day: "Day 20", storage: 79 },
    { day: "Day 25", storage: 70 },
    { day: "Day 30", storage: 66 },
];

const anomalies: AnomalyItem[] = [
    {
        id: 1,
        title: "Stale Data Warning",
        message: "No telemetry gap detected, system is healthy.",
        severity: "low",
        time: "Today, 9:20 AM",
    },
    {
        id: 2,
        title: "Turbidity Check",
        message: "Latest turbidity reading is normal.",
        severity: "low",
        time: "Today, 9:10 AM",
    },
    {
        id: 3,
        title: "Forecast Status",
        message: "30-day storage forecast generated successfully.",
        severity: "medium",
        time: "Today, 8:00 AM",
    },
];

function getSeverityClass(severity: "low" | "medium" | "high") {
    switch (severity) {
        case "high":
            return "severity-high";
        case "medium":
            return "severity-medium";
        default:
            return "severity-low";
    }
}

function StatCard({
    title,
    value,
    status = "normal",
}: StatCardData) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <p className="stat-title">{title}</p>
            </div>

            <h3 className="stat-value">{value}</h3>

            <div className="stat-card-status">
                <span className={`status-pill status-${status}`}>{status}</span>
            </div>
        </div>
    );
}

function MiniBarChart({
    data,
}: {
    data: Array<{ day: string; rain: number }>;
}) {
    const max = Math.max(...data.map((item) => item.rain));

    return (
        <div className="mini-chart">
            <div className="mini-chart-bars">
                {data.map((item) => (
                    <div key={item.day} className="mini-chart-item">
                        <div
                            className="mini-chart-bar"
                            style={{ height: `${(item.rain / max) * 100}%` }}
                            title={`${item.rain} mm`}
                        />
                        <span className="mini-chart-label">{item.day}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ForecastList({
    data,
}: {
    data: Array<{ day: string; storage: number }>;
}) {
    return (
        <div className="forecast-list">
            {data.map((item) => (
                <div key={item.day} className="forecast-row">
                    <span>{item.day}</span>
                    <div className="forecast-progress">
                        <div
                            className="forecast-progress-fill"
                            style={{ width: `${item.storage}%` }}
                        />
                    </div>
                    <span>{item.storage}%</span>
                </div>
            ))}
        </div>
    );
}

export default function LabDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="lab-dashboard-page page-container">
                        <div className="dashboard-main">
                            <div className="dashboard-topbar">
                                <div>
                                    <h1 className="dashboard-title">Raincatcher Lab Dashboard</h1>
                                </div>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>

                            <div className="stats-grid">
                                {stats.map((item) => (
                                    <StatCard key={item.title} {...item} />
                                ))}
                            </div>

                            <div className="dashboard-grid two-columns">
                                <section className="lab-card">
                                    <div className="section-header">
                                        <div>
                                            <h2>Rainfall Trend</h2>
                                            <p>Past 7 days mock telemetry overview</p>
                                        </div>
                                    </div>
                                    <MiniBarChart data={rainfallData} />
                                </section>

                                <section className="lab-card">
                                    <div className="section-header">
                                        <div>
                                            <h2>30-Day Storage Forecast</h2>
                                            <p>Projected tank storage percentage</p>
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
                                            <p>Review recent warnings and system messages</p>
                                        </div>
                                    </div>

                                    <div className="anomaly-list">
                                        {anomalies.map((item) => (
                                            <div key={item.id} className="anomaly-item">
                                                <div className="anomaly-top">
                                                    <h3>{item.title}</h3>
                                                    <span className={`severity-badge ${getSeverityClass(item.severity)}`}>
                                                        {item.severity}
                                                    </span>
                                                </div>
                                                <p>{item.message}</p>
                                                <span className="anomaly-time">{item.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="lab-card">
                                    <div className="section-header">
                                        <div>
                                            <h2>Latest Tank Image</h2>
                                            <p>Daily inspection snapshot</p>
                                        </div>
                                    </div>

                                    <div className="image-placeholder">
                                        <img
                                            src={tankImage}
                                            alt="Tank camera"
                                            className="image-preview"
                                        />

                                        <div className="image-meta">
                                            <p><strong>Date:</strong> 21 Apr 2026</p>
                                            <p><strong>Status:</strong> Normal</p>
                                            <p><strong>Device:</strong> RC-01</p>
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