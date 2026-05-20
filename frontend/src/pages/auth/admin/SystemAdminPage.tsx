import { useState } from "react";
import {
    Activity,
    AlertTriangle,
    Droplets,
    Gauge,
    ShieldCheck,
    SlidersHorizontal,
    ThermometerSun,
} from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/admin.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type ThresholdStatus = "ready" | "draft" | "missing";
type SensorStatus = "active" | "offline" | "maintenance";
type SimulationMode = "normal" | "warning" | "critical" | "ph-only";

type ThresholdRule = {
    id: number;
    metric: string;
    unit: string;
    normalRange: string;
    warningRange: string;
    criticalRule: string;
    status: ThresholdStatus;
    icon: React.ReactNode;
};

type SensorRegistryRow = {
    id: number;
    tank: string;
    sensor: string;
    location: string;
    lastReading: string;
    status: SensorStatus;
};

type ThresholdField = "normalRange" | "warningRange" | "criticalRule";

const initialThresholdRules: ThresholdRule[] = [
    {
        id: 1,
        metric: "Water Level",
        unit: "%",
        normalRange: "50 - 90",
        warningRange: "30 - 49 or 91 - 95",
        criticalRule: "< 30 or > 95",
        status: "draft",
        icon: <Droplets size={20} />,
    },
    {
        id: 2,
        metric: "pH",
        unit: "pH",
        normalRange: "6.5 - 8.5",
        warningRange: "6.0 - 6.4 or 8.6 - 9.0",
        criticalRule: "< 6.0 or > 9.0",
        status: "ready",
        icon: <Gauge size={20} />,
    },
    {
        id: 3,
        metric: "Turbidity",
        unit: "NTU",
        normalRange: "0 - 5",
        warningRange: "5.1 - 15",
        criticalRule: "> 15",
        status: "missing",
        icon: <Activity size={20} />,
    },
    {
        id: 4,
        metric: "Temperature",
        unit: "C",
        normalRange: "24 - 32",
        warningRange: "20 - 23 or 33 - 36",
        criticalRule: "< 20 or > 36",
        status: "draft",
        icon: <ThermometerSun size={20} />,
    },
];

const sensorRegistry: SensorRegistryRow[] = [
    {
        id: 1,
        tank: "Tank A",
        sensor: "Water Level Sensor",
        location: "Campus Pilot Site",
        lastReading: "76%",
        status: "active",
    },
    {
        id: 2,
        tank: "Tank A",
        sensor: "pH Probe",
        location: "Campus Pilot Site",
        lastReading: "7.2 pH",
        status: "active",
    },
    {
        id: 3,
        tank: "Tank B",
        sensor: "Turbidity Sensor",
        location: "Campus Pilot Site",
        lastReading: "18.9 NTU",
        status: "maintenance",
    },
    {
        id: 4,
        tank: "Calibration Unit",
        sensor: "Temperature Sensor",
        location: "Lab Bench",
        lastReading: "Offline",
        status: "offline",
    },
];

const simulationModes: Array<{
    value: SimulationMode;
    label: string;
    description: string;
}> = [
    {
        value: "normal",
        label: "Normal",
        description: "Generate stable readings inside safe thresholds.",
    },
    {
        value: "warning",
        label: "Warning",
        description: "Generate edge-case readings for dashboard testing.",
    },
    {
        value: "critical",
        label: "Critical",
        description: "Generate anomaly-heavy readings for alert workflows.",
    },
    {
        value: "ph-only",
        label: "pH Only",
        description: "Match the current lab state where pH is the only real dataset.",
    },
];

function getThresholdStatusClass(status: ThresholdStatus) {
    if (status === "missing") return "admin-status-critical";
    if (status === "draft") return "admin-status-warning";
    return "admin-status-normal";
}

function getSensorStatusClass(status: SensorStatus) {
    if (status === "offline") return "admin-status-critical";
    if (status === "maintenance") return "admin-status-warning";
    return "admin-status-normal";
}

export default function SystemAdminPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [thresholdRules, setThresholdRules] = useState(initialThresholdRules);
    const [simulationMode, setSimulationMode] = useState<SimulationMode>("normal");
    const [autoGenerate, setAutoGenerate] = useState(true);

    function updateThreshold(
        id: number,
        field: ThresholdField,
        value: string,
    ) {
        setThresholdRules((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        [field]: value,
                        status: item.status === "missing" ? "draft" : item.status,
                    }
                    : item
            )
        );
    }

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
                                <span className="admin-kicker">Configuration</span>
                                <h1 className="admin-page-title">System Admin</h1>
                                <p className="admin-page-subtitle">
                                    Prepare threshold rules, mock telemetry, registry data,
                                    reports, and benchmarking before the IoT feed is connected.
                                </p>
                            </div>

                            <div className="dashboard-actions">
                                <button className="admin-primary-btn" type="button">
                                    Save Mock Config
                                </button>
                                <ProfileMenu />
                            </div>
                        </div>

                        <section className="admin-panel admin-threshold-panel">
                            <div className="admin-panel-header">
                                <div>
                                    <h2>Threshold Rules</h2>
                                    <p>
                                        These values will later drive anomaly detection,
                                        water quality scoring, and report flags.
                                    </p>
                                </div>
                                <SlidersHorizontal size={20} />
                            </div>

                            <div className="admin-threshold-grid">
                                {thresholdRules.map((rule) => (
                                    <article key={rule.id} className="admin-threshold-card">
                                        <div className="admin-threshold-card-header">
                                            <div className="admin-threshold-title">
                                                <span>{rule.icon}</span>
                                                <div>
                                                    <h3>{rule.metric}</h3>
                                                    <p>Unit: {rule.unit}</p>
                                                </div>
                                            </div>
                                            <span className={`admin-status-pill ${getThresholdStatusClass(rule.status)}`}>
                                                {rule.status}
                                            </span>
                                        </div>

                                        <label className="admin-field">
                                            Normal range
                                            <input
                                                value={rule.normalRange}
                                                onChange={(event) =>
                                                    updateThreshold(rule.id, "normalRange", event.target.value)
                                                }
                                            />
                                        </label>

                                        <label className="admin-field">
                                            Warning range
                                            <input
                                                value={rule.warningRange}
                                                onChange={(event) =>
                                                    updateThreshold(rule.id, "warningRange", event.target.value)
                                                }
                                            />
                                        </label>

                                        <label className="admin-field">
                                            Critical rule
                                            <input
                                                value={rule.criticalRule}
                                                onChange={(event) =>
                                                    updateThreshold(rule.id, "criticalRule", event.target.value)
                                                }
                                            />
                                        </label>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Tank & Sensor Registry</h2>
                                        <p>Mock registry that can later map to real IoT devices.</p>
                                    </div>
                                    <ShieldCheck size={20} />
                                </div>

                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Tank</th>
                                                <th>Sensor</th>
                                                <th>Location</th>
                                                <th>Last Reading</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sensorRegistry.map((row) => (
                                                <tr key={row.id}>
                                                    <td>{row.tank}</td>
                                                    <td>{row.sensor}</td>
                                                    <td>{row.location}</td>
                                                    <td>{row.lastReading}</td>
                                                    <td>
                                                        <span className={`admin-status-pill ${getSensorStatusClass(row.status)}`}>
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
                                        <h2>Telemetry Simulation</h2>
                                        <p>Use mock readings until the hardware payload is ready.</p>
                                    </div>
                                    <Activity size={20} />
                                </div>

                                <div className="admin-mode-grid">
                                    {simulationModes.map((mode) => (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            className={`admin-mode-card ${simulationMode === mode.value ? "active" : ""}`}
                                            onClick={() => setSimulationMode(mode.value)}
                                        >
                                            <strong>{mode.label}</strong>
                                            <span>{mode.description}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="admin-toggle-row">
                                    <div>
                                        <h3>Auto-generate readings</h3>
                                        <p>Simulate telemetry intervals for dashboard demos.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`admin-toggle ${autoGenerate ? "active" : ""}`}
                                        onClick={() => setAutoGenerate((prev) => !prev)}
                                        aria-label="Toggle mock telemetry generation"
                                    >
                                        <span />
                                    </button>
                                </div>

                                <div className="admin-form-grid two">
                                    <label className="admin-field">
                                        Reading interval
                                        <select defaultValue="10 minutes">
                                            <option>5 minutes</option>
                                            <option>10 minutes</option>
                                            <option>15 minutes</option>
                                            <option>30 minutes</option>
                                        </select>
                                    </label>

                                    <label className="admin-field">
                                        Default tank
                                        <select defaultValue="Tank A">
                                            <option>Tank A</option>
                                            <option>Tank B</option>
                                            <option>Tank C</option>
                                            <option>All tanks</option>
                                        </select>
                                    </label>
                                </div>
                            </section>
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Report Rules</h2>
                                        <p>Controls for generated monitoring reports.</p>
                                    </div>
                                    <AlertTriangle size={20} />
                                </div>

                                <div className="admin-form-grid two">
                                    <label className="admin-field">
                                        Default report period
                                        <select defaultValue="Monthly">
                                            <option>Daily</option>
                                            <option>Weekly</option>
                                            <option>Monthly</option>
                                        </select>
                                    </label>

                                    <label className="admin-field">
                                        Include anomaly archive
                                        <select defaultValue="Yes">
                                            <option>Yes</option>
                                            <option>No</option>
                                        </select>
                                    </label>

                                    <label className="admin-field">
                                        Water quality score target
                                        <input defaultValue="85%" />
                                    </label>

                                    <label className="admin-field">
                                        Minimum storage target
                                        <input defaultValue="60%" />
                                    </label>
                                </div>
                            </section>

                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Benchmark Settings</h2>
                                        <p>Targets used to compare system performance over time.</p>
                                    </div>
                                    <Gauge size={20} />
                                </div>

                                <div className="admin-form-grid two">
                                    <label className="admin-field">
                                        Monthly production target
                                        <input defaultValue="18,000 L" />
                                    </label>

                                    <label className="admin-field">
                                        Forecast accuracy target
                                        <input defaultValue="90%" />
                                    </label>

                                    <label className="admin-field">
                                        Benchmark baseline
                                        <select defaultValue="Last 30 days">
                                            <option>Last 30 days</option>
                                            <option>Last 3 months</option>
                                            <option>Previous semester</option>
                                        </select>
                                    </label>

                                    <label className="admin-field">
                                        Comparison mode
                                        <select defaultValue="Before vs After Filter">
                                            <option>Before vs After Filter</option>
                                            <option>Tank-to-tank</option>
                                            <option>Monthly trend</option>
                                        </select>
                                    </label>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
