import { useEffect, useState } from "react";
import {
    Activity,
    AlertTriangle,
    BrainCircuit,
    Camera,
    FileText,
    Gauge,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/admin.css";
import Sidebar from "../../../components/layout/Sidebar";
import AdminTopbar from "../../../components/layout/AdminTopbar";
import {
    adminPriorities,
    type AdminStatus,
} from "../../../services/adminData";
import {
    RAINWATER_TANK_NAME,
} from "../../../services/sensorInputs";
import { formatCurrentDateTime } from "../../../services/time";
import { getAdminDevices, type AdminDevice } from "../../../services/adminDeviceApi";
import { getAdminSystemHealth, type AdminSystemHealthSummary } from "../../../services/adminSystemHealthApi";

type AdminMetric = {
    label: string;
    value: string;
    meta: string;
    status: AdminStatus;
    icon: React.ReactNode;
};

function getAdminStatusClass(status: AdminStatus | string) {
    if (status === "critical") return "admin-status-critical";
    if (status === "warning") return "admin-status-warning";
    if (status === "not_implemented" || status === "no_data" || status === "offline") return "admin-status-critical";
    if (status === "pending" || status === "stale" || status === "no_records") return "admin-status-warning";
    return "admin-status-normal";
}

function AdminMetricCard({ label, value, meta, status, icon }: AdminMetric) {
    return (
        <article className="admin-summary-card">
            <div className="admin-summary-top">
                <div className={`admin-summary-icon ${getAdminStatusClass(status)}`}>
                    {icon}
                </div>
                <span className={`admin-status-pill ${getAdminStatusClass(status)}`}>
                    {status}
                </span>
            </div>

            <p className="admin-summary-label">{label}</p>
            <h3 className="admin-summary-value">{value}</h3>
            <p className="admin-summary-meta">{meta}</p>
        </article>
    );
}

export default function AdminDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [devices, setDevices] = useState<AdminDevice[]>([]);
    const [health, setHealth] = useState<AdminSystemHealthSummary | null>(null);
    const [dashboardError, setDashboardError] = useState("");

    useEffect(() => {
        let active = true;
        Promise.all([getAdminDevices(), getAdminSystemHealth()])
            .then(([deviceRows, healthSummary]) => {
                if (!active) return;
                setDevices(deviceRows);
                setHealth(healthSummary);
                setDashboardError("");
            })
            .catch(() => {
                if (active) setDashboardError("Admin backend APIs are unavailable.");
            });
        return () => { active = false; };
    }, []);

    const onlineDevices = devices.filter((device) => device.status === "Online").length;
    const warningDevices = devices.filter((device) => device.status === "Warning" || device.status === "Pending").length;
    const adminMetrics: AdminMetric[] = [
        {
            label: "Online Devices",
            value: `${onlineDevices} / ${devices.length || "--"}`,
            meta: `${warningDevices} devices need review or are pending telemetry`,
            status: onlineDevices > 0 ? "normal" : "warning",
            icon: <Activity size={22} />,
        },
        {
            label: "Backend API",
            value: health?.backendApi ?? "Checking",
            meta: "Spring Boot backend admin endpoint status",
            status: health?.backendApi === "online" ? "normal" : "warning",
            icon: <SlidersHorizontal size={22} />,
        },
        {
            label: "Forecast API",
            value: String(health?.forecastApi ?? "Checking"),
            meta: "Forecast runs and calibration-ready storage output",
            status: health?.forecastApi === "has_completed_runs" ? "normal" : "warning",
            icon: <Gauge size={22} />,
        },
        {
            label: "ESP32 Telemetry",
            value: String(health?.esp32Telemetry ?? "Checking"),
            meta: health?.sensorLastSeenAt ? `Last seen ${health.sensorLastSeenAt}` : "Waiting for latest telemetry",
            status: health?.esp32Telemetry === "online" ? "normal" : "warning",
            icon: <AlertTriangle size={22} />,
        },
    ];

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="admin-page page-container">
                        <AdminTopbar
                            kicker="Super Admin"
                            title="Admin Dashboard"
                            subtitle={`Configure the monitoring rules that power telemetry for ${RAINWATER_TANK_NAME}.`}
                            secondaryAction={
                                <button className="admin-secondary-btn" type="button">
                                    Last checked {formatCurrentDateTime()}
                                </button>
                            }
                        />

                        {dashboardError && <div className="admin-inline-alert">{dashboardError}</div>}

                        <div className="admin-summary-grid">
                            {adminMetrics.map((item) => (
                                <AdminMetricCard key={item.label} {...item} />
                            ))}
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Device Health</h2>
                                        <p>Current database-backed device and service registry.</p>
                                    </div>
                                    <ShieldCheck size={20} />
                                </div>

                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Sensor</th>
                                                <th>Input Tag</th>
                                                <th>Source</th>
                                                <th>Last Value</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {devices.map((row) => (
                                                <tr key={row.id}>
                                                    <td>{row.name}</td>
                                                    <td>{row.inputTag ?? "--"}</td>
                                                    <td>{row.category}</td>
                                                    <td>{row.lastData}</td>
                                                    <td>
                                                        <span className={`admin-status-pill ${getAdminStatusClass(row.status === "Online" ? "normal" : "warning")}`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Admin Priorities</h2>
                                    <p>Open setup tasks while hardware services are being completed.</p>
                                    </div>
                                    <FileText size={20} />
                                </div>

                                <div className="admin-task-list">
                                    {adminPriorities.map((priority) => (
                                        <article key={priority.id} className="admin-task-item">
                                            <span className={`admin-task-marker ${getAdminStatusClass(priority.severity)}`} />
                                            <div>
                                                <div className="admin-task-top">
                                                    <h3>{priority.issue}</h3>
                                                    <span className={`admin-status-pill ${getAdminStatusClass(priority.severity)}`}>
                                                        {priority.status}
                                                    </span>
                                                </div>
                                                <p><strong>Source:</strong> {priority.source}</p>
                                                <p>{priority.suggestedAction}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <section className="admin-panel">
                            <div className="admin-panel-header">
                                <div>
                                    <h2>System Engines</h2>
                                    <p>Runtime placeholders for telemetry, forecast, anomaly, AI, report, and camera services.</p>
                                </div>
                                <BrainCircuit size={20} />
                            </div>

                            <div className="admin-grid admin-grid-three">
                                {(health?.services ?? []).map((engine) => (
                                    <article key={engine.serviceKey} className="admin-mini-panel admin-engine-card">
                                        <div className="admin-engine-top">
                                            <h2>{engine.serviceName}</h2>
                                            {engine.serviceKey.includes("camera") ? <Camera size={18} /> : <Activity size={18} />}
                                        </div>
                                        <span className={`admin-status-pill ${getAdminStatusClass(engine.status)}`}>
                                            {engine.status}
                                        </span>
                                        <p>{engine.detail}</p>
                                        <p><strong>Checked:</strong> {engine.checkedAt}</p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
