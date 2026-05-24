import { useMemo, useState } from "react";
import { Bell, CloudRain, Droplets, ThermometerSun, Wind } from "lucide-react";
import "../../../styles/dashboard.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import RpiCameraFeed from "../../../components/lab/RpiCameraFeed";
import {
    RAINWATER_TANK_NAME,
    SENSOR_INPUT_TAGS,
    formatNullableValue,
    placeholderTelemetryRecord,
} from "../../../services/sensorInputs";
import {
    formatCurrentDateTime,
    getProjectionDays,
} from "../../../services/time";

type StatCardData = {
    title: string;
    value: string;
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

type NotificationItem = {
    id: number;
    title: string;
    message: string;
    time: string;
    severity: "low" | "medium" | "high";
};

const notifications: NotificationItem[] = [];
const rainfallData: Array<{ day: string; rain: number | null }> = [];
const anomalies: AnomalyItem[] = [];

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

function StatCard({ title, value, status = "warning", inputTag }: StatCardData) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <p className="stat-title">{title}</p>
            </div>

            <h3 className="stat-value">{value}</h3>

            <div className="stat-card-status">
                <span className={`status-pill status-${status}`}>{inputTag}</span>
            </div>
        </div>
    );
}

function MiniBarChart({ data }: { data: Array<{ day: string; rain: number | null }> }) {
    const numericValues = data
        .map((item) => item.rain)
        .filter((value): value is number => typeof value === "number");

    if (numericValues.length === 0) {
        return (
            <div className="empty-state compact">
                <strong>No rainfall history yet</strong>
                <span>Rainfall bars will render after weather or local station input is connected.</span>
            </div>
        );
    }

    const max = Math.max(...numericValues);

    return (
        <div className="mini-chart">
            <div className="mini-chart-bars">
                {data.map((item) => (
                    <div key={item.day} className="mini-chart-item">
                        <div
                            className="mini-chart-bar"
                            style={{ height: `${item.rain ? (item.rain / max) * 100 : 0}%` }}
                            title={`${item.rain ?? 0} mm`}
                        />
                        <span className="mini-chart-label">{item.day}</span>
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
            {data.map((item) => (
                <div key={item.day} className="forecast-row">
                    <span>{item.day}</span>
                    <div className="forecast-progress">
                        <div
                            className="forecast-progress-fill"
                            style={{ width: `${item.storage ?? 0}%` }}
                        />
                    </div>
                    <span>{item.storage === null ? "--" : `${item.storage}%`}</span>
                </div>
            ))}
        </div>
    );
}

export default function LabDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const now = formatCurrentDateTime();

    const stats: StatCardData[] = useMemo(() => [
        {
            title: "pH",
            value: formatNullableValue(placeholderTelemetryRecord.ph, "pH"),
            status: "warning",
            inputTag: SENSOR_INPUT_TAGS.ph,
        },
        {
            title: "Turbidity",
            value: formatNullableValue(placeholderTelemetryRecord.turbidityNtu, "NTU"),
            status: "warning",
            inputTag: SENSOR_INPUT_TAGS.turbidity,
        },
        {
            title: "Water Temperature",
            value: formatNullableValue(placeholderTelemetryRecord.waterTemperatureC, "C"),
            status: "warning",
            inputTag: SENSOR_INPUT_TAGS.waterTemperature,
        },
        {
            title: "Tank Level",
            value: formatNullableValue(placeholderTelemetryRecord.ultrasonicWaterLevelPercent, "%"),
            status: "warning",
            inputTag: `${SENSOR_INPUT_TAGS.ultrasonicTrig} + ${SENSOR_INPUT_TAGS.ultrasonicEcho}`,
        },
    ], []);

    const forecastData = useMemo(
        () => getProjectionDays(7).map((item) => ({ day: item.day, storage: null })),
        [],
    );

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
                                    <div className="notification-wrapper">
                                        <button
                                            type="button"
                                            className="notification-btn"
                                            onClick={() => setNotificationOpen((prev) => !prev)}
                                            aria-label="View anomaly alerts"
                                        >
                                            <Bell size={18} />
                                            <span className="notification-dot">{notifications.length}</span>
                                        </button>

                                        {notificationOpen && (
                                            <div className="notification-dropdown">
                                                <div className="notification-header">
                                                    <h3>Anomaly Alerts</h3>
                                                    <span>{notifications.length} new</span>
                                                </div>

                                                {notifications.length === 0 ? (
                                                    <div className="empty-state compact">
                                                        <strong>No active alerts</strong>
                                                        <span>Anomaly notifications will appear after telemetry rules run.</span>
                                                    </div>
                                                ) : (
                                                    <div className="notification-list">
                                                        {notifications.map((item) => (
                                                            <div key={item.id} className="notification-item">
                                                                <div className={`notification-alert-dot ${getSeverityClass(item.severity)}`} />
                                                                <div>
                                                                    <div className="notification-item-top">
                                                                        <strong>{item.title}</strong>
                                                                        <span>{item.time}</span>
                                                                    </div>
                                                                    <p>{item.message}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button type="button" className="notification-view-all">
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
                                    <div className="weather-icon">
                                        <CloudRain size={26} />
                                    </div>

                                    <div>
                                        <p className="weather-label">Current Weather Input</p>
                                        <h2>Awaiting weather API</h2>
                                        <span>Last refreshed {now}</span>
                                    </div>
                                </div>

                                <div className="weather-stats">
                                    <div>
                                        <Droplets size={18} />
                                        <span>Rainfall</span>
                                        <strong>-- mm</strong>
                                    </div>

                                    <div>
                                        <Wind size={18} />
                                        <span>Wind</span>
                                        <strong>-- km/h</strong>
                                    </div>

                                    <div>
                                        <ThermometerSun size={18} />
                                        <span>Humidity</span>
                                        <strong>--%</strong>
                                    </div>
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
                                            <p>Prepared for weather or local rainfall input</p>
                                        </div>
                                    </div>
                                    <MiniBarChart data={rainfallData} />
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
                                                        <span className={`severity-badge ${getSeverityClass(item.severity)}`}>
                                                            {item.severity}
                                                        </span>
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
                                        />
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

