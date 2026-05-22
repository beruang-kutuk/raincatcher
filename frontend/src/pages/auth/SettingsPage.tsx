import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard.css";
import "../../styles/settings.css";
import Sidebar from "../../components/layout/Sidebar";
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

const profileByRole = {
    LAB_ASSISTANT: {
        name: "Jasmine Tan",
        title: "Lab Engineer",
        email: "jasmine@example.com",
    },
    SYSTEM_ADMIN: {
        name: "Super Admin",
        title: "Super Administrator",
        email: "admin@raincatcher.local",
    },
};

export default function SettingsPage() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [theme, setTheme] = useState<ThemePreference>(() => getStoredThemePreference());
    const role = getStoredRole() ?? "LAB_ASSISTANT";
    const profile = profileByRole[role];

    function handleThemeChange(value: ThemePreference) {
        setTheme(value);
        saveThemePreference(value);
    }

    function handleLogout() {
        clearSession();
        navigate("/login", { replace: true });
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
                            </div>
                        </div>

                        <div className="settings-grid">
                            <section className="settings-panel">
                                <h2>Profile</h2>

                                <div className="settings-field">
                                    <label>Name</label>
                                    <input type="text" value={profile.name} readOnly />
                                </div>

                                <div className="settings-field">
                                    <label>Role</label>
                                    <input type="text" value={profile.title} readOnly />
                                </div>

                                <div className="settings-field">
                                    <label>Email</label>
                                    <input type="text" value={profile.email} readOnly />
                                </div>
                            </section>

                            <section className="settings-panel">
                                <h2>Preferences</h2>

                                <div className="settings-field">
                                    <label>Theme</label>
                                    <select
                                        value={theme}
                                        onChange={(e) =>
                                            handleThemeChange(e.target.value as ThemePreference)
                                        }
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                    </select>
                                </div>

                                <div className="settings-field">
                                    <label>Notification Frequency</label>
                                    <select defaultValue="Daily">
                                        <option>Daily</option>
                                        <option>Weekly</option>
                                        <option>Only Critical Alerts</option>
                                    </select>
                                </div>
                            </section>

                            <section className="settings-panel">
                                <h2>Account Actions</h2>

                                <button className="settings-btn" type="button">
                                    Change Password
                                </button>

                                <button
                                    className="settings-btn danger"
                                    type="button"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
