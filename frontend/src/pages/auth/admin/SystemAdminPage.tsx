import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    ClipboardList,
    CloudRain,
    Cpu,
    Gauge,
    HeartPulse,
    History,
    RefreshCcw,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    Wrench,
} from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/admin.css";
import Sidebar from "../../../components/layout/Sidebar";
import AdminTopbar from "../../../components/layout/AdminTopbar";
import {
    getAdminDevices,
    markAdminDeviceMaintenance,
    refreshAdminDevice,
    restartAdminDeviceService,
    updateAdminDeviceStatus,
    type AdminDevice,
} from "../../../services/adminDeviceApi";
import {
    getAdminSystemHealth,
    runAdminSystemHealthCheck,
    type AdminSystemHealthSummary,
    type AdminSystemService,
} from "../../../services/adminSystemHealthApi";
import {
    getAdminThresholds,
    resetAdminThresholds,
    saveAdminThresholds,
    type AdminThreshold,
} from "../../../services/adminThresholdApi";
import {
    getAdminForecastSettings,
    resetAdminForecastSettings,
    saveAdminForecastSettings,
    type AdminForecastSetting,
} from "../../../services/adminForecastSettingsApi";
import {
    createAdminReportTemplate,
    deleteAdminReportTemplate,
    getAdminReportTemplates,
    updateAdminReportTemplate,
    type AdminReportTemplate,
} from "../../../services/adminReportTemplateApi";
import {
    getAdminDiagnostics,
    runAdminDiagnostics,
    type AdminDiagnostic,
} from "../../../services/adminDiagnosticsApi";
import {
    clearAdminAuditLogs,
    getAdminAuditLogs,
    type AdminAuditLog,
} from "../../../services/adminAuditLogApi";

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
    icon: React.ReactNode;
}> = [
    { id: "overview", label: "System Overview", path: "/admin/system", description: "Admin control areas and live backend readiness.", icon: <ShieldCheck size={20} /> },
    { id: "devices", label: "Device Management", path: "/admin/devices", description: "Raspberry Pi, camera, ESP32, and sensor registry.", icon: <Cpu size={20} /> },
    { id: "health", label: "System Health", path: "/admin/system-health", description: "Backend, database, camera, YOLO, weather, forecast, and reports.", icon: <HeartPulse size={20} /> },
    { id: "thresholds", label: "Thresholds", path: "/admin/thresholds", description: "System-wide anomaly and warning limits.", icon: <Gauge size={20} /> },
    { id: "forecast", label: "Forecast Settings", path: "/admin/forecast-settings", description: "Default assumptions for forecasting modules.", icon: <CloudRain size={20} /> },
    { id: "reports", label: "Report Templates", path: "/admin/report-templates", description: "Reusable sections for generated reports.", icon: <ClipboardList size={20} /> },
    { id: "diagnostics", label: "Diagnostics", path: "/admin/diagnostics", description: "Troubleshooting checks and backend status history.", icon: <Wrench size={20} /> },
    { id: "audit", label: "Audit Logs", path: "/admin/audit-logs", description: "Activity trail for admin actions.", icon: <History size={20} /> },
];

const statusOptions = ["Online", "Offline", "Pending", "Warning"];

function getSectionFromPath(pathname: string): AdminSection {
    return sectionNav.find((item) => item.path === pathname)?.id ?? "overview";
}

function getAdminStatusClass(status: string) {
    const lowered = status.toLowerCase();
    if (lowered.includes("offline") || lowered.includes("critical") || lowered.includes("no_data")) return "admin-status-critical";
    if (lowered.includes("warning") || lowered.includes("pending") || lowered.includes("stale") || lowered.includes("not_implemented") || lowered.includes("no_records")) return "admin-status-warning";
    return "admin-status-normal";
}

function StatusPill({ status }: { status: string }) {
    return <span className={`admin-status-pill ${getAdminStatusClass(status)}`}>{status}</span>;
}

function SectionHeader({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
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

function toValueMap<T extends { value: string }>(items: T[], keyField: keyof T) {
    return Object.fromEntries(items.map((item) => [String(item[keyField]), item.value]));
}

export default function SystemAdminPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const activeSection = getSectionFromPath(location.pathname);
    const activeMeta = sectionNav.find((item) => item.id === activeSection) ?? sectionNav[0];

    const [devices, setDevices] = useState<AdminDevice[]>([]);
    const [health, setHealth] = useState<AdminSystemHealthSummary | null>(null);
    const [services, setServices] = useState<AdminSystemService[]>([]);
    const [thresholds, setThresholds] = useState<AdminThreshold[]>([]);
    const [forecastSettings, setForecastSettings] = useState<AdminForecastSetting[]>([]);
    const [reportTemplates, setReportTemplates] = useState<AdminReportTemplate[]>([]);
    const [diagnostics, setDiagnostics] = useState<AdminDiagnostic[]>([]);
    const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
    const [thresholdDraft, setThresholdDraft] = useState<Record<string, string>>({});
    const [forecastDraft, setForecastDraft] = useState<Record<string, string>>({});
    const [deviceStatusDraft, setDeviceStatusDraft] = useState<Record<number, string>>({});
    const [templateDraft, setTemplateDraft] = useState<Record<number, AdminReportTemplate>>({});
    const [newTemplateName, setNewTemplateName] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function loadAdminData() {
        setLoading(true);
        setError("");
        try {
            const [
                deviceRows,
                healthSummary,
                thresholdRows,
                forecastRows,
                templateRows,
                diagnosticRows,
                auditRows,
            ] = await Promise.all([
                getAdminDevices(),
                getAdminSystemHealth(),
                getAdminThresholds(),
                getAdminForecastSettings(),
                getAdminReportTemplates(),
                getAdminDiagnostics(),
                getAdminAuditLogs(),
            ]);

            setDevices(deviceRows);
            setHealth(healthSummary);
            setServices(healthSummary.services ?? []);
            setThresholds(thresholdRows);
            setForecastSettings(forecastRows);
            setReportTemplates(templateRows);
            setDiagnostics(diagnosticRows);
            setAuditLogs(auditRows);
            setThresholdDraft(toValueMap(thresholdRows, "thresholdKey"));
            setForecastDraft(toValueMap(forecastRows, "settingKey"));
            setDeviceStatusDraft(Object.fromEntries(deviceRows.map((device) => [device.id, device.status])));
            setTemplateDraft(Object.fromEntries(templateRows.map((template) => [template.id, template])));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Admin backend unavailable.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAdminData();
    }, []);

    const onlineDevices = useMemo(
        () => devices.filter((device) => device.status === "Online").length,
        [devices],
    );
    const currentAlerts = useMemo(
        () => [
            health?.esp32Telemetry && health.esp32Telemetry !== "online" ? `ESP32 telemetry ${health.esp32Telemetry}` : "",
            health?.yoloService === "not_implemented" ? "YOLO service check not implemented" : "",
            diagnostics.some((item) => item.result === "Not implemented") ? "Some diagnostics return Not implemented" : "",
        ].filter(Boolean),
        [health, diagnostics],
    );

    async function runAction(label: string, action: () => Promise<unknown>, after?: () => Promise<void> | void) {
        setActionLoading(label);
        setMessage("");
        setError("");
        try {
            await action();
            await after?.();
            setMessage(`${label} completed.`);
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : `${label} failed.`);
        } finally {
            setActionLoading("");
        }
    }

    function renderOverview() {
        const summaries = [
            { label: "Online Devices", value: `${onlineDevices} / ${devices.length}`, meta: "Device records are stored in admin_devices.", icon: <Cpu size={22} />, status: onlineDevices > 0 ? "normal" : "warning" },
            { label: "Threshold Rules", value: String(thresholds.length), meta: "Rules saved in admin_thresholds.", icon: <SlidersHorizontal size={22} />, status: thresholds.length > 0 ? "normal" : "warning" },
            { label: "Forecast Defaults", value: String(forecastSettings.length), meta: "Defaults saved in admin_forecast_settings.", icon: <CloudRain size={22} />, status: forecastSettings.length > 0 ? "normal" : "warning" },
            { label: "Audit Events", value: String(auditLogs.length), meta: "Admin actions create audit log entries.", icon: <History size={22} />, status: "normal" },
        ];

        return (
            <>
                <div className="admin-summary-grid">
                    {summaries.map((item) => (
                        <article key={item.label} className="admin-summary-card">
                            <div className="admin-summary-top">
                                <div className={`admin-summary-icon ${getAdminStatusClass(item.status)}`}>{item.icon}</div>
                                <StatusPill status={item.status} />
                            </div>
                            <p className="admin-summary-label">{item.label}</p>
                            <h3 className="admin-summary-value">{item.value}</h3>
                            <p className="admin-summary-meta">{item.meta}</p>
                        </article>
                    ))}
                </div>

                <div className="admin-grid admin-grid-balanced">
                    <section className="admin-panel">
                        <SectionHeader
                            title="System Control Areas"
                            description="Open a focused admin module."
                            icon={<ShieldCheck size={20} />}
                        />
                        <div className="admin-control-link-grid">
                            {sectionNav.filter((item) => item.id !== "overview").map((item) => (
                                <button key={item.id} type="button" className="admin-control-link" onClick={() => navigate(item.path)}>
                                    <span>{item.icon}</span>
                                    <strong>{item.label}</strong>
                                    <small>{item.description}</small>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="admin-panel">
                        <SectionHeader
                            title="Current Alerts"
                            description="Live backend statuses that need attention."
                            icon={<AlertTriangle size={20} />}
                        />
                        <div className="admin-task-list">
                            {currentAlerts.length === 0 ? (
                                <div className="empty-state compact"><strong>No current alerts</strong><span>Backend API and database-backed admin modules are responding.</span></div>
                            ) : currentAlerts.map((alert) => (
                                <article key={alert} className="admin-task-item">
                                    <span className="admin-task-marker admin-status-warning" />
                                    <div>
                                        <div className="admin-task-top">
                                            <h3>{alert}</h3>
                                            <StatusPill status="warning" />
                                        </div>
                                        <p>Review the related admin module for details.</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>
            </>
        );
    }

    function renderDevices() {
        return (
            <section className="admin-panel">
                <SectionHeader title="Device Management" description="Database-backed hardware registry and action controls." icon={<Cpu size={20} />} />
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Device</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Last Seen</th>
                                <th>Last Data</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((device) => (
                                <tr key={device.id}>
                                    <td>{device.name}</td>
                                    <td>{device.category}</td>
                                    <td><StatusPill status={device.status} /></td>
                                    <td>{device.lastSeen}</td>
                                    <td>{device.lastData}</td>
                                    <td>
                                        <div className="admin-actions-cell start">
                                            <select
                                                className="admin-inline-select"
                                                value={deviceStatusDraft[device.id] ?? device.status}
                                                onChange={(event) => setDeviceStatusDraft((prev) => ({ ...prev, [device.id]: event.target.value }))}
                                            >
                                                {statusOptions.map((option) => <option key={option}>{option}</option>)}
                                            </select>
                                            <button className="admin-secondary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Update Device", () => updateAdminDeviceStatus(device.id, deviceStatusDraft[device.id] ?? device.status), loadAdminData)}>
                                                Save
                                            </button>
                                            <button className="admin-secondary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Mark Maintenance", () => markAdminDeviceMaintenance(device.id), loadAdminData)}>
                                                Maintenance
                                            </button>
                                            <button className="admin-secondary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Refresh Device", () => refreshAdminDevice(device.id), loadAdminData)}>
                                                <RefreshCcw size={14} /> Refresh
                                            </button>
                                            <button className="admin-secondary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Restart Service", () => restartAdminDeviceService(device.id), loadAdminData)}>
                                                Restart
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }

    function renderHealth() {
        const cards = services.length > 0 ? services : [
            { id: 0, serviceKey: "backend_api", serviceName: "Backend API status", status: health?.backendApi ?? "unknown", implemented: true, detail: "Spring Boot backend API.", checkedAt: "" },
        ];

        return (
            <section className="admin-panel">
                <SectionHeader title="System Health" description="Useful service status cards without unused CPU, memory, or disk placeholders." icon={<HeartPulse size={20} />} />
                <div className="admin-diagnostic-actions">
                    <button className="admin-primary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("System Health Check", () => runAdminSystemHealthCheck(), loadAdminData)}>
                        {actionLoading === "System Health Check" ? "Checking..." : "Run Health Check"}
                    </button>
                </div>
                <div className="admin-grid admin-grid-three">
                    {cards.map((service) => (
                        <article key={service.serviceKey} className="admin-mini-panel admin-engine-card">
                            <div className="admin-engine-top">
                                <h2>{service.serviceName}</h2>
                                <StatusPill status={service.status} />
                            </div>
                            <p>{service.detail}</p>
                            <p><strong>Checked:</strong> {service.checkedAt || "Pending"}</p>
                        </article>
                    ))}
                </div>
            </section>
        );
    }

    function renderThresholds() {
        return (
            <section className="admin-panel">
                <SectionHeader title="Threshold Rules" description="Edit warning and anomaly thresholds saved in MariaDB." icon={<Gauge size={20} />} />
                <div className="admin-threshold-grid">
                    {thresholds.map((threshold) => (
                        <label key={threshold.thresholdKey} className="admin-threshold-card">
                            <div className="admin-threshold-card-header">
                                <div>
                                    <h3>{threshold.label}</h3>
                                    <p>{threshold.helper}</p>
                                </div>
                                <StatusPill status={threshold.severity} />
                            </div>
                            <div className="admin-threshold-input-row">
                                <input value={thresholdDraft[threshold.thresholdKey] ?? ""} onChange={(event) => setThresholdDraft((prev) => ({ ...prev, [threshold.thresholdKey]: event.target.value }))} />
                                <span>{threshold.unit}</span>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="admin-form-actions">
                    <button className="admin-primary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Save Thresholds", () => saveAdminThresholds(thresholdDraft), loadAdminData)}>
                        {actionLoading === "Save Thresholds" ? "Saving..." : "Save Thresholds"}
                    </button>
                    <button className="admin-secondary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Reset Thresholds", () => resetAdminThresholds(), loadAdminData)}>
                        Reset
                    </button>
                </div>
            </section>
        );
    }

    function renderForecastSettings() {
        return (
            <section className="admin-panel">
                <SectionHeader title="Forecast Settings" description="Default assumptions used by backend forecast modules." icon={<CloudRain size={20} />} />
                <div className="admin-threshold-grid">
                    {forecastSettings.map((setting) => (
                        <label key={setting.settingKey} className="admin-threshold-card">
                            <div className="admin-threshold-card-header">
                                <div>
                                    <h3>{setting.label}</h3>
                                    <p>{setting.helper}</p>
                                </div>
                            </div>
                            <div className="admin-threshold-input-row">
                                <input value={forecastDraft[setting.settingKey] ?? ""} onChange={(event) => setForecastDraft((prev) => ({ ...prev, [setting.settingKey]: event.target.value }))} />
                                <span>{setting.unit}</span>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="admin-form-actions">
                    <button className="admin-primary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Save Forecast Settings", () => saveAdminForecastSettings(forecastDraft), loadAdminData)}>
                        {actionLoading === "Save Forecast Settings" ? "Saving..." : "Save Forecast Settings"}
                    </button>
                    <button className="admin-secondary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Reset Forecast Settings", () => resetAdminForecastSettings(), loadAdminData)}>
                        Reset
                    </button>
                </div>
            </section>
        );
    }

    function renderReports() {
        return (
            <section className="admin-panel">
                <SectionHeader title="Report Templates" description="Create and edit database-backed report templates." icon={<ClipboardList size={20} />} />
                <div className="admin-create-row">
                    <input className="admin-field input" value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} placeholder="Template name" />
                    <button className="admin-primary-btn" type="button" disabled={actionLoading !== "" || !newTemplateName.trim()} onClick={() => runAction("Save Report Template", () => createAdminReportTemplate({ name: newTemplateName, description: "Custom admin report template", sectionsJson: "[]", enabled: true }), async () => { setNewTemplateName(""); await loadAdminData(); })}>
                        Create Template
                    </button>
                </div>
                <div className="admin-template-grid">
                    {reportTemplates.map((template) => {
                        const draft = templateDraft[template.id] ?? template;
                        return (
                            <article key={template.id} className="admin-mini-panel">
                                <label className="admin-field">
                                    Name
                                    <input value={draft.name} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, [template.id]: { ...draft, name: event.target.value } }))} />
                                </label>
                                <label className="admin-field">
                                    Description
                                    <textarea value={draft.description} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, [template.id]: { ...draft, description: event.target.value } }))} />
                                </label>
                                <label className="admin-field">
                                    Sections JSON
                                    <textarea value={draft.sectionsJson} onChange={(event) => setTemplateDraft((prev) => ({ ...prev, [template.id]: { ...draft, sectionsJson: event.target.value } }))} />
                                </label>
                                <div className="admin-form-actions">
                                    <button className="admin-primary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Save Report Template", () => updateAdminReportTemplate(template.id, draft), loadAdminData)}>
                                        Save
                                    </button>
                                    <button className="admin-secondary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Delete Report Template", () => deleteAdminReportTemplate(template.id), loadAdminData)}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        );
    }

    function renderDiagnostics() {
        return (
            <section className="admin-panel">
                <SectionHeader title="Diagnostics" description="Run backend diagnostics and keep the results in admin_diagnostics." icon={<Wrench size={20} />} />
                <div className="admin-diagnostic-actions">
                    <button className="admin-primary-btn" type="button" disabled={actionLoading !== ""} onClick={() => runAction("Run Diagnostics", () => runAdminDiagnostics(), loadAdminData)}>
                        {actionLoading === "Run Diagnostics" ? "Running..." : "Run Diagnostics"}
                    </button>
                </div>
                <div className="admin-diagnostic-grid">
                    {diagnostics.length === 0 ? (
                        <div className="empty-state compact"><strong>No diagnostics yet</strong><span>Run diagnostics to create backend records.</span></div>
                    ) : diagnostics.map((item) => (
                        <article key={item.id} className="admin-diagnostic-card">
                            <div className="admin-task-top">
                                <h3>{item.checkName}</h3>
                                <StatusPill status={item.status} />
                            </div>
                            <p>{item.detail}</p>
                            <p><strong>Result:</strong> {item.result}</p>
                        </article>
                    ))}
                </div>
            </section>
        );
    }

    function renderAudit() {
        return (
            <section className="admin-panel">
                <SectionHeader title="Audit Logs" description="Database-backed admin action history." icon={<History size={20} />} />
                <div className="admin-form-actions">
                    <button className="admin-secondary-btn" type="button" disabled={actionLoading !== "" || auditLogs.length === 0} onClick={() => runAction("Clear Audit Logs", () => clearAdminAuditLogs(), loadAdminData)}>
                        Clear Audit Logs
                    </button>
                </div>
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
                            {auditLogs.length === 0 ? (
                                <tr><td colSpan={5}>No audit records yet.</td></tr>
                            ) : auditLogs.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.event}</td>
                                    <td>{row.actor}</td>
                                    <td>{row.target}</td>
                                    <td>{row.createdAt}</td>
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
        if (loading) return <div className="empty-state compact"><strong>Loading admin modules</strong><span>Fetching database-backed admin APIs.</span></div>;
        switch (activeSection) {
            case "devices": return renderDevices();
            case "health": return renderHealth();
            case "thresholds": return renderThresholds();
            case "forecast": return renderForecastSettings();
            case "reports": return renderReports();
            case "diagnostics": return renderDiagnostics();
            case "audit": return renderAudit();
            default: return renderOverview();
        }
    }

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="admin-page page-container">
                        <AdminTopbar
                            kicker="Admin System Controls"
                            title={activeMeta.label}
                            subtitle={activeMeta.description}
                            inlineMessage={message || error}
                            secondaryAction={
                                <button className="admin-secondary-btn" type="button" onClick={() => void loadAdminData()} disabled={loading || actionLoading !== ""}>
                                    {loading ? "Loading..." : "Refresh"}
                                </button>
                            }
                        />

                        {error && <div className="admin-inline-alert">{error}</div>}
                        {actionLoading && <div className="admin-inline-alert">{actionLoading} in progress...</div>}

                        {renderActiveSection()}
                    </div>
                </main>
            </div>
        </div>
    );
}
