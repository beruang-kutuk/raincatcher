import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/dashboard.css";
import "../../styles/settings.css";
import Sidebar from "../../components/layout/Sidebar";
import ProfileMenu from "../../components/layout/ProfileMenu";
import SessionLoadingOverlay from "../../components/layout/SessionLoadingOverlay";
import {
    clearSession,
    getStoredRole,
    ROLE_LABELS,
} from "../../auth/rbac";
import {
    getStoredThemePreference,
    saveThemePreference,
    type ThemePreference,
} from "../../theme/theme";
import {
    RAINWATER_TANK_NAME,
    getPermissionLabel,
    getPolicyByManagedRole,
    profileByUserRole,
} from "../../services/adminData";
import { RPI_CAMERA_STREAM_URL } from "../../config/camera";

type SettingsTab =
    | "profile"
    | "appearance"
    | "dashboard"
    | "notifications"
    | "camera"
    | "reports"
    | "display"
    | "forecast"
    | "anomalies"
    | "adminSystem";

type ToggleProps = {
    label: string;
    description?: string;
    checked: boolean;
    onChange: () => void;
};

const baseTabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "profile", label: "Profile" },
    { id: "appearance", label: "Appearance" },
    { id: "dashboard", label: "Dashboard" },
    { id: "notifications", label: "Notifications" },
    { id: "camera", label: "Camera" },
    { id: "reports", label: "Reports" },
    { id: "display", label: "Data Display" },
    { id: "forecast", label: "Forecast View" },
    { id: "anomalies", label: "Anomaly Workflow" },
];

const dashboardPreferenceLabels = {
    liveCameraFeed: "Live camera feed",
    phCard: "pH card",
    turbidityCard: "Turbidity card",
    waterTemperatureCard: "Water temperature card",
    tankLevelCard: "Tank level card",
    forecastSummary: "Forecast summary",
    anomalySummary: "Anomaly summary",
    latestReports: "Latest reports",
};

const notificationPreferenceLabels = {
    phAbnormal: "pH abnormal alert",
    highTurbidity: "High turbidity alert",
    lowTankLevel: "Low tank level alert",
    overflowRisk: "Overflow risk alert",
    cameraOffline: "Camera offline alert",
    sensorDisconnected: "Sensor disconnected alert",
    reportGenerated: "Report generated alert",
};

const reportPreferenceLabels = {
    cameraSnapshots: "Camera snapshots",
    anomalySummary: "Anomaly summary",
    forecastSection: "Forecast section",
    recommendations: "Recommendations",
};

const adminSystemLinks = [
    {
        label: "Access Control",
        to: "/admin/access",
        description: "Manage users, roles, permissions, and account status.",
    },
    {
        label: "Device Management",
        to: "/admin/devices",
        description: "Review Raspberry Pi, camera, ESP32, and sensor status.",
    },
    {
        label: "System Health",
        to: "/admin/system-health",
        description: "Monitor gateway, memory, storage, API, and database readiness.",
    },
    {
        label: "Thresholds",
        to: "/admin/thresholds",
        description: "Edit pH, turbidity, level, overflow, temperature, and timeout limits.",
    },
    {
        label: "Forecast Settings",
        to: "/admin/forecast-settings",
        description: "Configure default forecast assumptions for system-wide modules.",
    },
    {
        label: "Audit Logs",
        to: "/admin/audit-logs",
        description: "View activity history for user and system events.",
    },
];

function SettingsToggle({ label, description, checked, onChange }: ToggleProps) {
    return (
        <button
            type="button"
            className="settings-toggle-row"
            onClick={onChange}
            aria-pressed={checked}
        >
            <span>
                <strong>{label}</strong>
                {description && <small>{description}</small>}
            </span>
            <span className={`settings-toggle ${checked ? "active" : ""}`}>
                <i />
            </span>
        </button>
    );
}

function PanelHeader({ title, description }: { title: string; description?: string }) {
    return (
        <div className="settings-panel-header">
            <h2>{title}</h2>
            {description && <p>{description}</p>}
        </div>
    );
}

export default function SettingsPage() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [theme, setTheme] = useState<ThemePreference>(() => getStoredThemePreference());
    const [saveMessage, setSaveMessage] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);
    const role = getStoredRole() ?? "LAB_ASSISTANT";
    const isAdmin = role === "SYSTEM_ADMIN";
    const profile = profileByUserRole[role];
    const assignedPolicy = getPolicyByManagedRole(profile.rolePolicy);
    const assignedPermissions = assignedPolicy.permissions.map(getPermissionLabel);
    const visibleTabs = isAdmin
        ? [...baseTabs, { id: "adminSystem" as SettingsTab, label: "Admin/System" }]
        : baseTabs;

    const [profileForm, setProfileForm] = useState({
        displayName: profile.name,
        phone: profile.phone,
        password: "",
    });
    const [profilePhotoName, setProfilePhotoName] = useState("No photo selected");
    const [appearance, setAppearance] = useState({
        sidebarPreference: "Expanded",
    });
    const [dashboardPrefs, setDashboardPrefs] = useState({
        liveCameraFeed: true,
        phCard: true,
        turbidityCard: true,
        waterTemperatureCard: true,
        tankLevelCard: true,
        forecastSummary: true,
        anomalySummary: true,
        latestReports: true,
    });
    const [notificationPrefs, setNotificationPrefs] = useState({
        phAbnormal: true,
        highTurbidity: true,
        lowTankLevel: true,
        overflowRisk: true,
        cameraOffline: true,
        sensorDisconnected: true,
        reportGenerated: false,
        severity: "Warning + critical",
    });
    const [cameraPrefs, setCameraPrefs] = useState({
        showLiveFeed: true,
        timestampOverlay: true,
        autoCapture: true,
        captureInterval: "30 minutes",
    });
    const [reportPrefs, setReportPrefs] = useState({
        defaultReportType: "Weekly",
        exportFormat: "PDF",
        cameraSnapshots: true,
        anomalySummary: true,
        forecastSection: true,
        recommendations: true,
    });
    const [displayPrefs, setDisplayPrefs] = useState({
        tankLevelDisplay: "Percentage",
        temperatureUnit: "Celsius",
        phDecimals: "1",
        graphRange: "24 hours",
        timeFormat: "12-hour",
    });
    const [forecastPrefs, setForecastPrefs] = useState({
        defaultView: "Weekly",
        riskForecast: true,
        whatIfPanel: true,
    });
    const [anomalyPrefs, setAnomalyPrefs] = useState({
        filter: "Unresolved only",
        sort: "Severity",
        acknowledge: true,
    });

    function handleThemeChange(value: ThemePreference) {
        setTheme(value);
        saveThemePreference(value);
        setSaveMessage(`Appearance preference saved for this session.`);
    }

    function handleLogout() {
        setLoggingOut(true);
        window.setTimeout(() => {
            clearSession();
            navigate("/login", { replace: true });
        }, 600);
    }

    function handleProfileSave(event: FormEvent) {
        event.preventDefault();
        setSaveMessage("Settings saved. Backend persistence endpoint is ready to connect later.");
    }

    function handlePreferenceSave() {
        setSaveMessage("Settings saved. Backend persistence endpoint is ready to connect later.");
    }

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="settings-page page-container">
                        <div className="settings-topbar">
                            <div>
                                <span className="settings-kicker">{ROLE_LABELS[role]}</span>
                                <h1 className="settings-page-title">Settings</h1>
                                <p className="settings-page-subtitle">
                                    {isAdmin
                                        ? "Personal preferences plus admin-only links to system controls."
                                        : "Personal profile and monitoring preferences. System controls are admin-only."}
                                </p>
                            </div>

                            <div className="dashboard-actions">
                                {saveMessage && <span className="settings-save-message">{saveMessage}</span>}
                                <button
                                    className="settings-btn primary compact-action"
                                    type="button"
                                    onClick={handlePreferenceSave}
                                >
                                    Save Settings
                                </button>
                                <ProfileMenu />
                            </div>
                        </div>

                        <div className="settings-layout">
                            <aside className="settings-tabs" aria-label="Settings sections">
                                {visibleTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </aside>

                            <div className="settings-content">
                                {activeTab === "profile" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Profile Settings"
                                            description="Role is assigned by an admin and cannot be changed here."
                                        />

                                        <form className="settings-form-grid" onSubmit={handleProfileSave}>
                                            <div className="settings-profile-photo">
                                                <img
                                                    src="https://i.pravatar.cc/120?img=12"
                                                    alt="Current profile"
                                                />
                                                <label className="settings-file-btn">
                                                    Change profile picture
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => {
                                                            const fileName = event.target.files?.[0]?.name;
                                                            setProfilePhotoName(fileName ?? "No photo selected");
                                                        }}
                                                    />
                                                </label>
                                                <span>{profilePhotoName}</span>
                                            </div>

                                            <label className="settings-field">
                                                Display name
                                                <input
                                                    type="text"
                                                    value={profileForm.displayName}
                                                    onChange={(event) =>
                                                        setProfileForm((prev) => ({
                                                            ...prev,
                                                            displayName: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            <label className="settings-field">
                                                Phone number
                                                <input
                                                    type="tel"
                                                    value={profileForm.phone}
                                                    onChange={(event) =>
                                                        setProfileForm((prev) => ({
                                                            ...prev,
                                                            phone: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            <label className="settings-field">
                                                Email
                                                <input type="email" value={profile.email} readOnly />
                                            </label>

                                            <label className="settings-field">
                                                Role
                                                <input type="text" value={profile.title} readOnly />
                                            </label>

                                            <label className="settings-field">
                                                Change password
                                                <input
                                                    type="password"
                                                    value={profileForm.password}
                                                    placeholder="New password"
                                                    onChange={(event) =>
                                                        setProfileForm((prev) => ({
                                                            ...prev,
                                                            password: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            <div className="settings-permission-block">
                                                <h3>Assigned permissions</h3>
                                                <div className="settings-chip-list">
                                                    {assignedPermissions.map((permission) => (
                                                        <span key={permission}>{permission}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="settings-action-row">
                                                <button className="settings-btn primary" type="submit">
                                                    Save Profile
                                                </button>
                                                <button
                                                    className="settings-btn danger"
                                                    type="button"
                                                    onClick={handleLogout}
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        </form>
                                    </section>
                                )}

                                {activeTab === "appearance" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Appearance Settings"
                                            description="Dark mode applies only after you choose it. Logout resets the app to light mode."
                                        />

                                        <div className="settings-form-grid two">
                                            <label className="settings-field">
                                                Theme
                                                <select
                                                    value={theme}
                                                    onChange={(event) =>
                                                        handleThemeChange(event.target.value as ThemePreference)
                                                    }
                                                >
                                                    <option value="light">Light</option>
                                                    <option value="dark">Dark</option>
                                                </select>
                                            </label>

                                            <label className="settings-field">
                                                Sidebar preference
                                                <select
                                                    value={appearance.sidebarPreference}
                                                    onChange={(event) =>
                                                        setAppearance((prev) => ({
                                                            ...prev,
                                                            sidebarPreference: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>Expanded</option>
                                                    <option>Collapsed</option>
                                                </select>
                                            </label>
                                        </div>
                                    </section>
                                )}

                                {activeTab === "dashboard" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Dashboard Preferences"
                                            description="Choose which operational cards appear in your monitoring workspace."
                                        />

                                        <div className="settings-option-list">
                                            {Object.entries(dashboardPreferenceLabels).map(([key, label]) => (
                                                <SettingsToggle
                                                    key={key}
                                                    label={label}
                                                    checked={dashboardPrefs[key as keyof typeof dashboardPrefs]}
                                                    onChange={() =>
                                                        setDashboardPrefs((prev) => ({
                                                            ...prev,
                                                            [key]: !prev[key as keyof typeof dashboardPrefs],
                                                        }))
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {activeTab === "notifications" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Notification Preferences"
                                            description="Personal alerts only. Admin alert policies will be wired to backend settings later."
                                        />

                                        <label className="settings-field compact">
                                            Severity preference
                                            <select
                                                value={notificationPrefs.severity}
                                                onChange={(event) =>
                                                    setNotificationPrefs((prev) => ({
                                                        ...prev,
                                                        severity: event.target.value,
                                                    }))
                                                }
                                            >
                                                <option>Critical only</option>
                                                <option>Warning + critical</option>
                                                <option>All alerts</option>
                                            </select>
                                        </label>

                                        <div className="settings-option-list">
                                            {Object.entries(notificationPreferenceLabels).map(([key, label]) => (
                                                <SettingsToggle
                                                    key={key}
                                                    label={label}
                                                    checked={notificationPrefs[key as keyof typeof notificationPreferenceLabels]}
                                                    onChange={() =>
                                                        setNotificationPrefs((prev) => ({
                                                            ...prev,
                                                            [key]: !prev[key as keyof typeof notificationPreferenceLabels],
                                                        }))
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {activeTab === "camera" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Camera Preferences"
                                            description="Personal camera display options for the Rainwater Tank."
                                        />

                                        <div className="settings-form-grid two">
                                            <label className="settings-field">
                                                Camera label
                                                <input type="text" value={RAINWATER_TANK_NAME} readOnly />
                                            </label>

                                            <label className="settings-field">
                                                Capture interval
                                                <select
                                                    value={cameraPrefs.captureInterval}
                                                    onChange={(event) =>
                                                        setCameraPrefs((prev) => ({
                                                            ...prev,
                                                            captureInterval: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>15 minutes</option>
                                                    <option>30 minutes</option>
                                                    <option>1 hour</option>
                                                    <option>2 hours</option>
                                                </select>
                                            </label>

                                            <label className="settings-field settings-field-wide">
                                                Raspberry Pi stream URL
                                                <input
                                                    type="text"
                                                    value={RPI_CAMERA_STREAM_URL}
                                                    readOnly
                                                    disabled={!isAdmin}
                                                    title={RPI_CAMERA_STREAM_URL}
                                                />
                                                {!isAdmin && (
                                                    <small>
                                                        Lab Assistants can view the feed but cannot change the stream URL.
                                                    </small>
                                                )}
                                            </label>
                                        </div>

                                        <div className="settings-option-list">
                                            <SettingsToggle
                                                label="Show live feed on dashboard"
                                                checked={cameraPrefs.showLiveFeed}
                                                onChange={() =>
                                                    setCameraPrefs((prev) => ({
                                                        ...prev,
                                                        showLiveFeed: !prev.showLiveFeed,
                                                    }))
                                                }
                                            />
                                            <SettingsToggle
                                                label="Timestamp overlay"
                                                checked={cameraPrefs.timestampOverlay}
                                                onChange={() =>
                                                    setCameraPrefs((prev) => ({
                                                        ...prev,
                                                        timestampOverlay: !prev.timestampOverlay,
                                                    }))
                                                }
                                            />
                                            <SettingsToggle
                                                label="Auto capture"
                                                checked={cameraPrefs.autoCapture}
                                                onChange={() =>
                                                    setCameraPrefs((prev) => ({
                                                        ...prev,
                                                        autoCapture: !prev.autoCapture,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </section>
                                )}

                                {activeTab === "reports" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Report Preferences"
                                            description="Defaults for personal report generation."
                                        />

                                        <div className="settings-form-grid two">
                                            <label className="settings-field">
                                                Default report type
                                                <select
                                                    value={reportPrefs.defaultReportType}
                                                    onChange={(event) =>
                                                        setReportPrefs((prev) => ({
                                                            ...prev,
                                                            defaultReportType: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>Daily</option>
                                                    <option>Weekly</option>
                                                    <option>Monthly</option>
                                                </select>
                                            </label>

                                            <label className="settings-field">
                                                Default export format
                                                <select
                                                    value={reportPrefs.exportFormat}
                                                    onChange={(event) =>
                                                        setReportPrefs((prev) => ({
                                                            ...prev,
                                                            exportFormat: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>PDF</option>
                                                    <option>CSV</option>
                                                </select>
                                            </label>
                                        </div>

                                        <div className="settings-option-list">
                                            {Object.entries(reportPreferenceLabels).map(([key, label]) => (
                                                <SettingsToggle
                                                    key={key}
                                                    label={label}
                                                    checked={reportPrefs[key as keyof typeof reportPreferenceLabels]}
                                                    onChange={() =>
                                                        setReportPrefs((prev) => ({
                                                            ...prev,
                                                            [key]: !prev[key as keyof typeof reportPreferenceLabels],
                                                        }))
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {activeTab === "display" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Data Display Preferences"
                                            description="Personal display defaults for charts, units, and telemetry precision."
                                        />

                                        <div className="settings-form-grid two">
                                            <label className="settings-field">
                                                Tank level display
                                                <select
                                                    value={displayPrefs.tankLevelDisplay}
                                                    onChange={(event) =>
                                                        setDisplayPrefs((prev) => ({
                                                            ...prev,
                                                            tankLevelDisplay: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>Litres</option>
                                                    <option>Percentage</option>
                                                </select>
                                            </label>

                                            <label className="settings-field">
                                                Temperature unit
                                                <input type="text" value={displayPrefs.temperatureUnit} readOnly />
                                            </label>

                                            <label className="settings-field">
                                                pH decimal places
                                                <select
                                                    value={displayPrefs.phDecimals}
                                                    onChange={(event) =>
                                                        setDisplayPrefs((prev) => ({
                                                            ...prev,
                                                            phDecimals: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>0</option>
                                                    <option>1</option>
                                                    <option>2</option>
                                                </select>
                                            </label>

                                            <label className="settings-field">
                                                Default graph range
                                                <select
                                                    value={displayPrefs.graphRange}
                                                    onChange={(event) =>
                                                        setDisplayPrefs((prev) => ({
                                                            ...prev,
                                                            graphRange: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>24 hours</option>
                                                    <option>7 days</option>
                                                    <option>30 days</option>
                                                </select>
                                            </label>

                                            <label className="settings-field">
                                                Time format
                                                <select
                                                    value={displayPrefs.timeFormat}
                                                    onChange={(event) =>
                                                        setDisplayPrefs((prev) => ({
                                                            ...prev,
                                                            timeFormat: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>12-hour</option>
                                                    <option>24-hour</option>
                                                </select>
                                            </label>
                                        </div>
                                    </section>
                                )}

                                {activeTab === "forecast" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Forecast View Preferences"
                                            description="Lab Assistants can run what-if simulations without changing system-wide forecast assumptions."
                                        />

                                        <label className="settings-field compact">
                                            Default forecast view
                                            <select
                                                value={forecastPrefs.defaultView}
                                                onChange={(event) =>
                                                    setForecastPrefs((prev) => ({
                                                        ...prev,
                                                        defaultView: event.target.value,
                                                    }))
                                                }
                                            >
                                                <option>Weekly</option>
                                                <option>Monthly</option>
                                            </select>
                                        </label>

                                        <div className="settings-option-list">
                                            <SettingsToggle
                                                label="Show risk forecast by default"
                                                checked={forecastPrefs.riskForecast}
                                                onChange={() =>
                                                    setForecastPrefs((prev) => ({
                                                        ...prev,
                                                        riskForecast: !prev.riskForecast,
                                                    }))
                                                }
                                            />
                                            <SettingsToggle
                                                label="Show what-if forecast panel"
                                                checked={forecastPrefs.whatIfPanel}
                                                onChange={() =>
                                                    setForecastPrefs((prev) => ({
                                                        ...prev,
                                                        whatIfPanel: !prev.whatIfPanel,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </section>
                                )}

                                {activeTab === "anomalies" && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Anomaly Workflow Preferences"
                                            description="Personal anomaly review defaults. Admin-level system controls remain separate."
                                        />

                                        <div className="settings-form-grid two">
                                            <label className="settings-field">
                                                Default anomaly filter
                                                <select
                                                    value={anomalyPrefs.filter}
                                                    onChange={(event) =>
                                                        setAnomalyPrefs((prev) => ({
                                                            ...prev,
                                                            filter: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>All</option>
                                                    <option>Unresolved only</option>
                                                    <option>Critical only</option>
                                                </select>
                                            </label>

                                            <label className="settings-field">
                                                Sort anomalies by
                                                <select
                                                    value={anomalyPrefs.sort}
                                                    onChange={(event) =>
                                                        setAnomalyPrefs((prev) => ({
                                                            ...prev,
                                                            sort: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option>Severity</option>
                                                    <option>Date</option>
                                                </select>
                                            </label>
                                        </div>

                                        <div className="settings-option-list">
                                            <SettingsToggle
                                                label="Enable acknowledge/review workflow"
                                                description="Uses the current frontend anomaly review controls when available."
                                                checked={anomalyPrefs.acknowledge}
                                                onChange={() =>
                                                    setAnomalyPrefs((prev) => ({
                                                        ...prev,
                                                        acknowledge: !prev.acknowledge,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </section>
                                )}

                                {activeTab === "adminSystem" && isAdmin && (
                                    <section className="settings-panel">
                                        <PanelHeader
                                            title="Admin/System Settings"
                                            description="Admin-only controls are grouped here and exposed through the admin navigation."
                                        />

                                        <div className="settings-admin-links">
                                            {adminSystemLinks.map((item) => (
                                                <Link key={item.to} to={item.to} className="settings-admin-link">
                                                    <strong>{item.label}</strong>
                                                    <span>{item.description}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            {loggingOut && <SessionLoadingOverlay message="Logging out..." />}
        </div>
    );
}
