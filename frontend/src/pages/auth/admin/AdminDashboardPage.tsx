import { useState } from "react";
import {
    Activity,
    AlertTriangle,
    FileText,
    Gauge,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/admin.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type AdminStatus = "normal" | "warning" | "critical";

type AdminMetric = {
    label: string;
    value: string;
    meta: string;
    status: AdminStatus;
    icon: React.ReactNode;
};

type SensorHealthRow = {
    id: number;
    site: string;
    tank: string;
    sensors: string;
    lastSync: string;
    status: AdminStatus;
};

type AdminTask = {
    id: number;
    title: string;
    description: string;
    status: AdminStatus;
};

const adminMetrics: AdminMetric[] = [
    {
        label: "Active Sensors",
        value: "12 / 14",
        meta: "2 sensors need attention",
        status: "warning",
        icon: <Activity size={22} />,
    },
    {
        label: "Threshold Profiles",
        value: "4",
        meta: "Water level, pH, turbidity, temperature",
        status: "normal",
        icon: <SlidersHorizontal size={22} />,
    },
    {
        label: "Benchmark Score",
        value: "91%",
        meta: "Last 30-day system performance",
        status: "normal",
        icon: <Gauge size={22} />,
    },
    {
        label: "Open Admin Tasks",
        value: "3",
        meta: "1 critical configuration gap",
        status: "critical",
        icon: <AlertTriangle size={22} />,
    },
];

const sensorHealthRows: SensorHealthRow[] = [
    {
        id: 1,
        site: "Campus Pilot Site",
        tank: "Tank A",
        sensors: "Level, pH, turbidity, temperature",
        lastSync: "10 mins ago",
        status: "normal",
    },
    {
        id: 2,
        site: "Campus Pilot Site",
        tank: "Tank B",
        sensors: "Level, turbidity",
        lastSync: "35 mins ago",
        status: "warning",
    },
    {
        id: 3,
        site: "Lab Bench",
        tank: "Calibration Unit",
        sensors: "pH",
        lastSync: "Offline",
        status: "critical",
    },
];

const adminTasks: AdminTask[] = [
    {
        id: 1,
        title: "Add turbidity threshold",
        description: "Required before automated water quality anomaly detection is complete.",
        status: "critical",
    },
    {
        id: 2,
        title: "Confirm monthly forecast baseline",
        description: "Benchmark rules need an expected monthly harvested-water target.",
        status: "warning",
    },
    {
        id: 3,
        title: "Prepare IoT switch-over mapping",
        description: "Mock telemetry fields are ready to map to real sensor payloads later.",
        status: "normal",
    },
];

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

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="admin-page page-container">
                        <div className="admin-topbar">
                            <div>
                                <span className="admin-kicker">Super Admin</span>
                                <h1 className="admin-page-title">Admin Dashboard</h1>
                                <p className="admin-page-subtitle">
                                    Configure the monitoring rules that power telemetry,
                                    anomalies, reports, and benchmark testing.
                                </p>
                            </div>

                            <div className="dashboard-actions">
                                <button className="admin-secondary-btn" type="button">
                                    Mock Data Active
                                </button>
                                <ProfileMenu />
                            </div>
                        </div>

                        <div className="admin-summary-grid">
                            {adminMetrics.map((item) => (
                                <AdminMetricCard key={item.label} {...item} />
                            ))}
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Sensor Health</h2>
                                        <p>Current registry readiness for the RWH pilot system.</p>
                                    </div>
                                    <ShieldCheck size={20} />
                                </div>

                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Site</th>
                                                <th>Tank</th>
                                                <th>Sensors</th>
                                                <th>Last Sync</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sensorHealthRows.map((row) => (
                                                <tr key={row.id}>
                                                    <td>{row.site}</td>
                                                    <td>{row.tank}</td>
                                                    <td>{row.sensors}</td>
                                                    <td>{row.lastSync}</td>
                                                    <td>
                                                        <span className={`admin-status-pill ${getAdminStatusClass(row.status)}`}>
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
                                        <p>Next configuration work before real IoT data arrives.</p>
                                    </div>
                                    <FileText size={20} />
                                </div>

                                <div className="admin-task-list">
                                    {adminTasks.map((task) => (
                                        <article key={task.id} className="admin-task-item">
                                            <span className={`admin-task-marker ${getAdminStatusClass(task.status)}`} />
                                            <div>
                                                <div className="admin-task-top">
                                                    <h3>{task.title}</h3>
                                                    <span className={`admin-status-pill ${getAdminStatusClass(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                                <p>{task.description}</p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="admin-grid admin-grid-three">
                            <section className="admin-panel admin-mini-panel">
                                <h2>Anomaly Engine</h2>
                                <p>
                                    Thresholds will convert telemetry into unresolved,
                                    investigating, or resolved anomaly cases.
                                </p>
                            </section>

                            <section className="admin-panel admin-mini-panel">
                                <h2>Reporting Engine</h2>
                                <p>
                                    Report rules will summarize storage, water quality,
                                    anomalies, and forecast accuracy.
                                </p>
                            </section>

                            <section className="admin-panel admin-mini-panel">
                                <h2>Forecast Engine</h2>
                                <p>
                                    Monthly usable-water production can be simulated until
                                    rainfall and storage history are connected.
                                </p>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
