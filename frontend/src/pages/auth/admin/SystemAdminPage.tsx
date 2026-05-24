import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Activity,
    AlertTriangle,
    Camera,
    ClipboardList,
    CloudRain,
    Cpu,
    Eye,
    Gauge,
    History,
    RefreshCcw,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    Wrench,
    X,
} from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/admin.css";
import Sidebar from "../../../components/layout/Sidebar";
import AdminTopbar from "../../../components/layout/AdminTopbar";
import { RPI_CAMERA_STREAM_URL } from "../../../config/camera";
import {
    RAINWATER_TANK_NAME,
    auditLogs,
    deviceRows,
    diagnosticCards,
    forecastSettings,
    reportTemplateSections,
    systemHealthMetrics,
    thresholdSettings,
    type AdminStatus,
    type DeviceStatus,
} from "../../../services/adminData";

type AdminSection =
    | "overview"
    | "devices"
    | "health"
    | "thresholds"
    | "forecast"
    | "reports"
    | "diagnostics"
    | "audit";

const sectionNav: Array<{
    id: AdminSection;
    label: string;
    path: string;
    description: string;
}> = [
    {
        id: "overview",
        label: "System Overview",
        path: "/admin/system",
        description: "Summary of system controls and current integration readiness.",
    },
    {
        id: "devices",
        label: "Device Management",
        path: "/admin/devices",
        description: "Raspberry Pi, camera, ESP32, and sensor registry.",
    },
    {
        id: "health",
        label: "System Health",
        path: "/admin/system-health",
        description: "Gateway, storage, camera, API, and database health.",
    },
    {
        id: "thresholds",
        label: "Thresholds",
        path: "/admin/thresholds",
        description: "System-wide anomaly and warning limits.",
    },
    {
        id: "forecast",
        label: "Forecast Settings",
        path: "/admin/forecast-settings",
        description: "Default assumptions for forecasting modules.",
    },
    {
        id: "reports",
        label: "Report Templates",
        path: "/admin/report-templates",
        description: "Default sections for generated reports.",
    },
    {
        id: "diagnostics",
        label: "Diagnostics",
        path: "/admin/diagnostics",
        description: "Troubleshooting checks and repair action placeholders.",
    },
    {
        id: "audit",
        label: "Audit Logs",
        path: "/admin/audit-logs",
        description: "Activity trail structure for user and system events.",
    },
];

function getSectionFromPath(pathname: string): AdminSection {
    const match = sectionNav.find((item) => item.path === pathname);
    return match?.id ?? "overview";
}

function getAdminStatusClass(status: AdminStatus) {
    if (status === "critical") return "admin-status-critical";
    if (status === "warning") return "admin-status-warning";
    return "admin-status-normal";
}

function getDeviceStatusClass(status: DeviceStatus) {
    if (status === "Offline") return "admin-status-critical";
    if (status === "Pending" || status === "Warning") return "admin-status-warning";
    return "admin-status-normal";
}

function StatusPill({ status }: { status: AdminStatus | DeviceStatus }) {
    const className =
        status === "Online" || status === "Offline" || status === "Pending" || status === "Warning"
            ? getDeviceStatusClass(status)
            : getAdminStatusClass(status);

    return <span className={`admin-status-pill ${className}`}>{status}</span>;
}

function SectionHeader({
    title,
    description,
    icon,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="admin-panel-header">
            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            {icon}
        </div>
    );
}

export default function SystemAdminPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const activeSection = getSectionFromPath(location.pathname);
    const activeMeta = sectionNav.find((item) => item.id === activeSection) ?? sectionNav[0];
    const [thresholdValues, setThresholdValues] = useState(() =>
        Object.fromEntries(thresholdSettings.map((setting) => [setting.id, setting.value])),
    );
    const [forecastValues, setForecastValues] = useState(() =>
        Object.fromEntries(forecastSettings.map((setting) => [setting.id, setting.value])),
    );
    const [reportSections, setReportSections] = useState(reportTemplateSections);
    const [diagnosticMessage, setDiagnosticMessage] = useState("Diagnostics ready. Actions are prepared for backend integration.");
    const [saveMessage, setSaveMessage] = useState("");
    const [viewDevice, setViewDevice] = useState<typeof deviceRows[0] | null>(null);
    const [manageDevice, setManageDevice] = useState<typeof deviceRows[0] | null>(null);
    const [manageStatus, setManageStatus] = useState("");
    const [manageSensorTag, setManageSensorTag] = useState("");
    const [manageActionMsg, setManageActionMsg] = useState("");

    const onlineDevices = useMemo(
        () => deviceRows.filter((device) => device.status === "Online").length,
        [],
    );
    const warningDevices = useMemo(
        () => deviceRows.filter((device) => device.status === "Warning" || device.status === "Pending").length,
        [],
    );

    function renderOverview() {
        return (
            <>
                <div className="admin-summary-grid">
                    <article className="admin-summary-card">
                        <div className="admin-summary-top">
                            <div className="admin-summary-icon admin-status-normal">
                                <Cpu size={22} />
                            </div>
                            <span className="admin-status-pill admin-status-normal">devices</span>
                        </div>
                        <p className="admin-summary-label">Online Devices</p>
                        <h3 className="admin-summary-value">{onlineDevices} / {deviceRows.length}</h3>
                        <p className="admin-summary-meta">
                            {warningDevices} devices need admin review or calibration.
                        </p>
                    </article>

                    <article className="admin-summary-card">
                        <div className="admin-summary-top">
                            <div className="admin-summary-icon admin-status-warning">
                                <SlidersHorizontal size={22} />
                            </div>
                            <span className="admin-status-pill admin-status-warning">pending</span>
                        </div>
                        <p className="admin-summary-label">Threshold Rules</p>
                        <h3 className="admin-summary-value">{thresholdSettings.length}</h3>
                        <p className="admin-summary-meta">
                            Rules prepared for anomaly backend integration.
                        </p>
                    </article>

                    <article className="admin-summary-card">
                        <div className="admin-summary-top">
                            <div className="admin-summary-icon admin-status-normal">
                                <CloudRain size={22} />
                            </div>
                            <span className="admin-status-pill admin-status-normal">forecast</span>
                        </div>
                        <p className="admin-summary-label">Forecast Defaults</p>
                        <h3 className="admin-summary-value">{forecastSettings.length}</h3>
                        <p className="admin-summary-meta">
                            Default system assumptions are separated from Lab Assistant what-if runs.
                        </p>
                    </article>

                    <article className="admin-summary-card">
                        <div className="admin-summary-top">
                            <div className="admin-summary-icon admin-status-normal">
                                <History size={22} />
                            </div>
                            <span className="admin-status-pill admin-status-normal">audit</span>
                        </div>
                        <p className="admin-summary-label">Audit Events</p>
                        <h3 className="admin-summary-value">{auditLogs.length}</h3>
                        <p className="admin-summary-meta">
                            Audit structure covers login, role, threshold, reports, and camera access.
                        </p>
                    </article>
                </div>

                <div className="admin-grid admin-grid-balanced">
                    <section className="admin-panel">
                        <SectionHeader
                            title="System Control Areas"
                            description="Open a focused admin section from the navigation or the controls below."
                            icon={<ShieldCheck size={20} />}
                        />

                        <div className="admin-control-link-grid">
                            {sectionNav.filter((item) => item.id !== "overview").map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="admin-control-link"
                                    onClick={() => navigate(item.path)}
                                >
                                    <strong>{item.label}</strong>
                                    <span>{item.description}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="admin-panel">
                        <SectionHeader
                            title="Current Alerts"
                            description="Priorities for the Rainwater Tank integration path."
                            icon={<AlertTriangle size={20} />}
                        />

                        <div className="admin-task-list">
                            <article className="admin-task-item">
                                <span className="admin-task-marker admin-status-warning" />
                                <div>
                                    <div className="admin-task-top">
                                        <h3>ESP32 telemetry delay</h3>
                                        <StatusPill status="Warning" />
                                    </div>
                                    <p>Sensor node last data arrived later than expected.</p>
                                </div>
                            </article>

                            <article className="admin-task-item">
                                <span className="admin-task-marker admin-status-warning" />
                                <div>
                                    <div className="admin-task-top">
                                        <h3>Water temperature sensor pending</h3>
                                        <StatusPill status="Pending" />
                                    </div>
                                    <p>Calibration step before live readings are trusted.</p>
                                </div>
                            </article>
                        </div>
                    </section>
                </div>
            </>
        );
    }

    function renderDevices() {
        return (
            <section className="admin-panel">
                <SectionHeader
                    title="Device and Sensor Management"
                    description={`System-wide hardware registry for ${RAINWATER_TANK_NAME}. Actions are prepared until backend APIs are connected.`}
                    icon={<Cpu size={20} />}
                />

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Device</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Last Seen</th>
                                <th>Last Data Received</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deviceRows.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.name}</td>
                                    <td>{row.category}</td>
                                    <td><StatusPill status={row.status} /></td>
                                    <td>{row.lastSeen}</td>
                                    <td>{row.lastData}</td>
                                    <td>
                                        <div className="admin-actions-cell start">
                                            <button
                                                type="button"
                                                className="admin-icon-btn"
                                                title="View device details"
                                                aria-label="View device details"
                                                onClick={() => setViewDevice(row)}
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-icon-btn"
                                                title="Manage device"
                                                aria-label="Manage device"
                                                onClick={() => {
                                                    setManageDevice(row);
                                                    setManageStatus(row.status);
                                                    setManageSensorTag(row.inputTag ?? "");
                                                    setManageActionMsg("");
                                                }}
                                            >
                                                <Settings size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-info-strip">
                    <Camera size={18} />
                    <div>
                        <strong>Configured camera stream</strong>
                        <span title={RPI_CAMERA_STREAM_URL}>{RPI_CAMERA_STREAM_URL}</span>
                    </div>
                </div>
            </section>
        );
    }

    function renderHealth() {
        return (
            <section className="admin-panel">
                <SectionHeader
                    title="System Health"
                    description="Gateway and service health slots for the prototype."
                    icon={<Activity size={20} />}
                />

                <div className="admin-health-grid">
                    {systemHealthMetrics.map((metric) => (
                        <article key={metric.label} className="admin-health-card">
                            <div className="admin-health-card-top">
                                <div>
                                    <h3>{metric.label}</h3>
                                    <strong>{metric.value}</strong>
                                </div>
                                <StatusPill status={metric.status} />
                            </div>
                            {typeof metric.progress === "number" && (
                                <div className="admin-meter">
                                    <span style={{ width: `${metric.progress}%` }} />
                                </div>
                            )}
                            <p>{metric.helper}</p>
                        </article>
                    ))}
                </div>
            </section>
        );
    }

    function renderThresholds() {
        return (
            <section className="admin-panel">
                <SectionHeader
                    title="Threshold Management"
                    description="Admin-only system thresholds that will later drive anomaly detection."
                    icon={<Gauge size={20} />}
                />

                <div className="admin-settings-grid">
                    {thresholdSettings.map((setting) => (
                        <label key={setting.id} className="admin-field">
                            {setting.label}
                            <div className="admin-input-with-unit">
                                <input
                                    value={thresholdValues[setting.id]}
                                    onChange={(event) =>
                                        setThresholdValues((prev) => ({
                                            ...prev,
                                            [setting.id]: event.target.value,
                                        }))
                                    }
                                />
                                <span>{setting.unit}</span>
                            </div>
                            <small>{setting.helper}</small>
                        </label>
                    ))}
                </div>

                <button
                    className="admin-primary-btn"
                    type="button"
                    onClick={() => setSaveMessage("Threshold settings saved locally. Backend settings API is ready to connect later.")}
                >
                    Save Thresholds
                </button>
            </section>
        );
    }

    function renderForecast() {
        return (
            <section className="admin-panel">
                <SectionHeader
                    title="Forecast Settings"
                    description="System-wide assumptions used by forecast modules. Lab Assistants can run what-if simulations without saving these."
                    icon={<CloudRain size={20} />}
                />

                <div className="admin-settings-grid">
                    {forecastSettings.map((setting) => (
                        <label key={setting.id} className="admin-field">
                            {setting.label}
                            {setting.kind === "select" ? (
                                <select
                                    value={forecastValues[setting.id]}
                                    onChange={(event) =>
                                        setForecastValues((prev) => ({
                                            ...prev,
                                            [setting.id]: event.target.value,
                                        }))
                                    }
                                >
                                    {setting.options?.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="admin-input-with-unit">
                                    <input
                                        value={forecastValues[setting.id]}
                                        onChange={(event) =>
                                            setForecastValues((prev) => ({
                                                ...prev,
                                                [setting.id]: event.target.value,
                                            }))
                                        }
                                    />
                                    {setting.unit && <span>{setting.unit}</span>}
                                </div>
                            )}
                            <small>{setting.helper}</small>
                        </label>
                    ))}
                </div>

                <button
                    className="admin-primary-btn"
                    type="button"
                    onClick={() => setSaveMessage("Forecast defaults saved locally. Backend forecast settings API is ready to connect later.")}
                >
                    Save Forecast Defaults
                </button>
            </section>
        );
    }

    function renderReports() {
        return (
            <section className="admin-panel">
                <SectionHeader
                    title="Report Template Management"
                    description="Default report sections for generated monitoring reports."
                    icon={<ClipboardList size={20} />}
                />

                <div className="admin-template-list">
                    {reportSections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className="admin-template-row"
                            onClick={() =>
                                setReportSections((prev) =>
                                    prev.map((item) =>
                                        item.id === section.id
                                            ? { ...item, enabled: !item.enabled }
                                            : item,
                                    ),
                                )
                            }
                            aria-pressed={section.enabled}
                        >
                            <span>
                                <strong>{section.label}</strong>
                                <small>{section.enabled ? "Included by default" : "Excluded by default"}</small>
                            </span>
                            <span className={`admin-toggle ${section.enabled ? "active" : ""}`}>
                                <i />
                            </span>
                        </button>
                    ))}
                </div>

                <button
                    className="admin-primary-btn"
                    type="button"
                    onClick={() => setSaveMessage("Report template saved locally. Backend report template API is ready to connect later.")}
                >
                    Save Report Template
                </button>
            </section>
        );
    }

    function renderDiagnostics() {
        return (
            <section className="admin-panel">
                <SectionHeader
                    title="Troubleshooting and Diagnostics"
                    description="Diagnostic cards and repair controls for admin workflows."
                    icon={<Wrench size={20} />}
                />

                <div className="admin-diagnostic-actions">
                    <button
                        className="admin-primary-btn"
                        type="button"
                        onClick={() => setDiagnosticMessage("Diagnostics queued for all prepared services.")}
                    >
                        Run Diagnostics
                    </button>
                    <button
                        className="admin-secondary-btn"
                        type="button"
                        onClick={() => setDiagnosticMessage("Camera feed restart action queued.")}
                    >
                        Restart Camera Feed
                    </button>
                    <button
                        className="admin-secondary-btn"
                        type="button"
                        onClick={() => setDiagnosticMessage("Sensor connection refresh action queued.")}
                    >
                        Refresh Sensor Connection
                    </button>
                    <button
                        className="admin-secondary-btn"
                        type="button"
                        onClick={() => setDiagnosticMessage("Log export action queued.")}
                    >
                        Export Logs
                    </button>
                </div>

                <div className="admin-info-strip">
                    <RefreshCcw size={18} />
                    <div>
                        <strong>Status</strong>
                        <span>{diagnosticMessage}</span>
                    </div>
                </div>

                <div className="admin-diagnostic-grid">
                    {diagnosticCards.map((card) => (
                        <article key={card.id} className="admin-diagnostic-card">
                            <div className="admin-task-top">
                                <h3>{card.title}</h3>
                                <StatusPill status={card.status} />
                            </div>
                            <p>{card.description}</p>
                        </article>
                    ))}
                </div>
            </section>
        );
    }

    function renderAudit() {
        return (
            <section className="admin-panel">
                <SectionHeader
                    title="Audit Logs"
                    description="Audit log structure for role, threshold, report, forecast, anomaly, and camera activity."
                    icon={<History size={20} />}
                />

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Actor</th>
                                <th>Target</th>
                                <th>Timestamp</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.event}</td>
                                    <td>{row.actor}</td>
                                    <td>{row.target}</td>
                                    <td>{row.timestamp}</td>
                                    <td><StatusPill status={row.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }

    function renderActiveSection() {
        switch (activeSection) {
            case "devices":
                return renderDevices();
            case "health":
                return renderHealth();
            case "thresholds":
                return renderThresholds();
            case "forecast":
                return renderForecast();
            case "reports":
                return renderReports();
            case "diagnostics":
                return renderDiagnostics();
            case "audit":
                return renderAudit();
            default:
                return renderOverview();
        }
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
                        <AdminTopbar
                            kicker="Admin System Controls"
                            title={activeMeta.label}
                            subtitle={activeMeta.description}
                            inlineMessage={saveMessage}
                            secondaryAction={
                                <button className="admin-secondary-btn" type="button">Integration Ready</button>
                            }
                        />

                        <div className="admin-section-tabs">
                            {sectionNav.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`admin-section-tab ${activeSection === item.id ? "active" : ""}`}
                                    onClick={() => navigate(item.path)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {renderActiveSection()}
                    </div>
                </main>
            </div>

            {viewDevice && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal-card">
                        <div className="admin-modal-header">
                            <div>
                                <h2>{viewDevice.name}</h2>
                                <p>{viewDevice.category}</p>
                            </div>
                            <button
                                type="button"
                                className="admin-icon-btn"
                                onClick={() => setViewDevice(null)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="admin-modal-grid">
                            <div><span>Status</span><StatusPill status={viewDevice.status} /></div>
                            <div><span>Category</span><strong>{viewDevice.category}</strong></div>
                            <div><span>Last Seen</span><strong>{viewDevice.lastSeen}</strong></div>
                            <div><span>Last Data</span><strong>{viewDevice.lastData}</strong></div>
                            {viewDevice.inputTag && (
                                <div className="admin-modal-wide"><span>Sensor Tag</span><strong>{viewDevice.inputTag}</strong></div>
                            )}
                        </div>

                        <div className="admin-modal-section">
                            <h3>Recent Logs</h3>
                            <div className="admin-modal-log-list">
                                <div className="admin-modal-log-item"><span className="admin-status-pill admin-status-warning">pending</span> Telemetry listener waiting for ESP32 connection</div>
                                <div className="admin-modal-log-item"><span className="admin-status-pill admin-status-warning">pending</span> Sensor heartbeat not yet received</div>
                                <div className="admin-modal-log-item"><span className="admin-status-pill admin-status-normal">ready</span> Backend device endpoint prepared</div>
                                <div className="admin-modal-log-item"><span className="admin-status-pill admin-status-normal">ready</span> Camera stream URL configured</div>
                            </div>
                            <p className="admin-modal-note">Full device logs will load from <code>GET /api/devices/{"{id}"}/logs</code> when backend is connected.</p>
                        </div>

                        <div className="admin-modal-actions">
                            <button type="button" className="admin-secondary-btn" onClick={() => setViewDevice(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {manageDevice && (
                <div className="admin-modal-backdrop">
                    <div className="admin-modal-card">
                        <div className="admin-modal-header">
                            <div>
                                <h2>Manage: {manageDevice.name}</h2>
                                <p>Admin controls for this device. Backend endpoints are prepared but not yet connected.</p>
                            </div>
                            <button
                                type="button"
                                className="admin-icon-btn"
                                onClick={() => setManageDevice(null)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="admin-modal-section">
                            <h3>Update Status</h3>
                            <div className="admin-modal-field-row">
                                <select
                                    className="admin-inline-select"
                                    value={manageStatus}
                                    onChange={(e) => setManageStatus(e.target.value)}
                                >
                                    <option>Online</option>
                                    <option>Offline</option>
                                    <option>Pending</option>
                                    <option>Warning</option>
                                </select>
                                <button
                                    type="button"
                                    className="admin-primary-btn"
                                    onClick={() => setManageActionMsg(`Status updated to "${manageStatus}" in frontend. Backend PATCH /api/devices/${manageDevice.id}/status is ready to connect.`)}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>

                        <div className="admin-modal-section">
                            <h3>Assign Sensor Tag</h3>
                            <div className="admin-modal-field-row">
                                <input
                                    className="admin-field input"
                                    value={manageSensorTag}
                                    onChange={(e) => setManageSensorTag(e.target.value)}
                                    placeholder="e.g. ultrasonic_trig"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="admin-primary-btn"
                                    onClick={() => setManageActionMsg(`Sensor tag "${manageSensorTag}" assigned in frontend. Backend PATCH /api/devices/${manageDevice.id}/tag is ready to connect.`)}
                                >
                                    Assign
                                </button>
                            </div>
                        </div>

                        <div className="admin-modal-section">
                            <h3>Device Actions</h3>
                            <div className="admin-modal-action-row">
                                <button type="button" className="admin-secondary-btn" onClick={() => setManageActionMsg("Restart service queued. POST /api/devices/" + manageDevice.id + "/restart is ready to connect.")}>
                                    <RefreshCcw size={14} /> Restart Service
                                </button>
                                <button type="button" className="admin-secondary-btn" onClick={() => setManageActionMsg("Connection refresh queued. POST /api/devices/" + manageDevice.id + "/refresh is ready to connect.")}>
                                    <Activity size={14} /> Refresh Connection
                                </button>
                                <button type="button" className="admin-secondary-btn" onClick={() => setManageActionMsg("Device marked as under maintenance. PATCH /api/devices/" + manageDevice.id + "/maintenance is ready to connect.")}>
                                    <Wrench size={14} /> Mark Maintenance
                                </button>
                            </div>
                        </div>

                        {manageActionMsg && (
                            <div className="admin-info-strip">
                                <ShieldCheck size={16} />
                                <div><span>{manageActionMsg}</span></div>
                            </div>
                        )}

                        <div className="admin-modal-actions">
                            <button type="button" className="admin-secondary-btn" onClick={() => setManageDevice(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
