import { useState } from "react";
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
    systemEngines,
    type AdminStatus,
} from "../../../services/adminData";
import {
    RAINWATER_TANK_NAME,
    sensorInputDefinitions,
} from "../../../services/sensorInputs";
import { formatCurrentDateTime } from "../../../services/time";

type AdminMetric = {
    label: string;
    value: string;
    meta: string;
    status: AdminStatus;
    icon: React.ReactNode;
};

function getAdminStatusClass(status: AdminStatus) {
    if (status === "critical") return "admin-status-critical";
    if (status === "warning") return "admin-status-warning";
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

    const pendingSensors = sensorInputDefinitions.filter((sensor) => sensor.status !== "online").length;
    const adminMetrics: AdminMetric[] = [
        {
            label: "Sensor Inputs Ready",
            value: `0 / ${sensorInputDefinitions.length}`,
            meta: `${pendingSensors} sensor inputs awaiting ESP32 telemetry`,
            status: "warning",
            icon: <Activity size={22} />,
        },
        {
            label: "Threshold Profiles",
            value: "Prepared",
            meta: "Water level, pH, turbidity, temperature, and timeout rules",
            status: "normal",
            icon: <SlidersHorizontal size={22} />,
        },
        {
            label: "Forecast Modules",
            value: "8",
            meta: "Benchmark, harvest, risk, storage, scenario, and AI modules",
            status: "normal",
            icon: <Gauge size={22} />,
        },
        {
            label: "Open Admin Priorities",
            value: String(adminPriorities.length),
            meta: "System setup actions before live deployment",
            status: "warning",
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

                        <div className="admin-summary-grid">
                            {adminMetrics.map((item) => (
                                <AdminMetricCard key={item.label} {...item} />
                            ))}
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Sensor Input Health</h2>
                                        <p>Current readiness for the Rainwater Tank sensor package.</p>
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
                                            {sensorInputDefinitions.map((row) => (
                                                <tr key={row.tag}>
                                                    <td>{row.label}</td>
                                                    <td>{row.tag}</td>
                                                    <td>{row.source}</td>
                                                    <td>{row.value ?? "--"} {row.value === null ? "" : row.unit}</td>
                                                    <td>
                                                        <span className={`admin-status-pill ${getAdminStatusClass(row.status === "online" ? "normal" : "warning")}`}>
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
                                        <p>Structured actions the system can learn from later.</p>
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
                                {systemEngines.map((engine) => (
                                    <article key={engine.id} className="admin-mini-panel admin-engine-card">
                                        <div className="admin-engine-top">
                                            <h2>{engine.name}</h2>
                                            {engine.name.includes("Camera") ? <Camera size={18} /> : <Activity size={18} />}
                                        </div>
                                        <span className={`admin-status-pill ${getAdminStatusClass(engine.status)}`}>
                                            {engine.health}
                                        </span>
                                        <p><strong>Last run:</strong> {engine.lastRun}</p>
                                        <p><strong>Input:</strong> {engine.inputSource}</p>
                                        <p><strong>Next:</strong> {engine.nextAction}</p>
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

