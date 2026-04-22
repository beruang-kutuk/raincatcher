import "../../styles/dashboard.css";
import "../../styles/settings.css";
import Sidebar from "../../components/layout/Sidebar";
import { useState } from "react";

export default function SettingsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

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
                            <h1 className="settings-page-title">Settings</h1>
                        </div>

                        <div className="settings-grid">
                            <section className="settings-panel">
                                <h2>Profile</h2>
                                <div className="settings-field">
                                    <label>Name</label>
                                    <input type="text" value="Jasmine Tan" readOnly />
                                </div>
                                <div className="settings-field">
                                    <label>Role</label>
                                    <input type="text" value="Lab Engineer" readOnly />
                                </div>
                                <div className="settings-field">
                                    <label>Email</label>
                                    <input type="text" value="jasmine@example.com" readOnly />
                                </div>
                            </section>

                            <section className="settings-panel">
                                <h2>Preferences</h2>
                                <div className="settings-field">
                                    <label>Theme</label>
                                    <select>
                                        <option>Light</option>
                                        <option>Dark</option>
                                    </select>
                                </div>
                                <div className="settings-field">
                                    <label>Notification Frequency</label>
                                    <select>
                                        <option>Daily</option>
                                        <option>Weekly</option>
                                        <option>Only Critical Alerts</option>
                                    </select>
                                </div>
                            </section>

                            <section className="settings-panel">
                                <h2>Account Actions</h2>
                                <button className="settings-btn">Change Password</button>
                                <button className="settings-btn danger">Logout</button>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}