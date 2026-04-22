import { useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/anomalies.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type SummaryCard = {
    label: string;
    value: string;
    meta: string;
    status: "high" | "medium" | "low";
};

type AnomalyRow = {
    id: number;
    time: string;
    source: string;
    description: string;
    severity: "high" | "medium" | "low";
    status: "unresolved" | "investigating" | "resolved";
    value: string;
};

const summaryCards: SummaryCard[] = [
    {
        label: "Total Anomalies",
        value: "24",
        meta: "+3 from last 7 days",
        status: "high",
    },
    {
        label: "High Severity",
        value: "6",
        meta: "25% of total",
        status: "high",
    },
    {
        label: "Medium Severity",
        value: "11",
        meta: "45% of total",
        status: "medium",
    },
    {
        label: "Low Severity",
        value: "7",
        meta: "30% of total",
        status: "low",
    },
];

const anomalyRows: AnomalyRow[] = [
    {
        id: 1,
        time: "22 Aug 2025, 10:42 AM",
        source: "Tank A - Water Level",
        description: "Water level dropped rapidly",
        severity: "high",
        status: "unresolved",
        value: "-18.4 cm/min",
    },
    {
        id: 2,
        time: "22 Aug 2025, 09:15 AM",
        source: "Tank B - pH Sensor",
        description: "pH level out of normal range",
        severity: "medium",
        status: "investigating",
        value: "pH 8.9",
    },
    {
        id: 3,
        time: "21 Aug 2025, 11:03 PM",
        source: "Tank C - Turbidity",
        description: "Sudden spike in turbidity",
        severity: "high",
        status: "unresolved",
        value: "98.6 NTU",
    },
    {
        id: 4,
        time: "21 Aug 2025, 06:47 PM",
        source: "Tank A - Temperature",
        description: "Temperature higher than usual",
        severity: "low",
        status: "resolved",
        value: "33.7 °C",
    },
    {
        id: 5,
        time: "21 Aug 2025, 03:21 PM",
        source: "Tank D - Flow Rate",
        description: "Flow rate dropped below threshold",
        severity: "medium",
        status: "investigating",
        value: "12.2 L/min",
    },
    {
        id: 6,
        time: "20 Aug 2025, 08:12 AM",
        source: "Tank B - Conductivity",
        description: "Conductivity out of range",
        severity: "low",
        status: "resolved",
        value: "612 µS/cm",
    },
];

function getSeverityClass(severity: "high" | "medium" | "low") {
    if (severity === "high") return "anomaly-badge-high";
    if (severity === "medium") return "anomaly-badge-medium";
    return "anomaly-badge-low";
}

function getStatusClass(status: "unresolved" | "investigating" | "resolved") {
    if (status === "unresolved") return "anomaly-status-unresolved";
    if (status === "investigating") return "anomaly-status-investigating";
    return "anomaly-status-resolved";
}

function SummaryStatCard({ label, value, meta, status }: SummaryCard) {
    return (
        <div className="anomalies-summary-card">
            <p className="anomalies-summary-label">{label}</p>
            <h3 className="anomalies-summary-value">{value}</h3>
            <div className="anomalies-summary-status">
                <span className={`status-pill ${getSeverityClass(status)}`}>
                    {status}
                </span>
            </div>
            <p className="anomalies-summary-meta">{meta}</p>
        </div>
    );
}

export default function AnomaliesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="anomalies-page page-container">
                        <div className="anomalies-topbar">
                            <div>
                                <h1 className="anomalies-page-title">Anomalies</h1>
                            </div>

                            <div className="anomalies-topbar-right">
                                <button className="anomalies-filter-btn" type="button">
                                    21 Apr 2026
                                </button>

                                <button className="anomalies-filter-btn" type="button">
                                    All Sensors
                                </button>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>
                        </div>

                        <div className="anomalies-summary-grid">
                            {summaryCards.map((item) => (
                                <SummaryStatCard key={item.label} {...item} />
                            ))}
                        </div>

                        <section className="anomalies-panel anomalies-filters-panel">
                            <div className="anomalies-filters-grid">
                                <div className="anomalies-filter-group anomalies-filter-search">
                                    <label>Search anomaly</label>
                                    <input
                                        type="text"
                                        placeholder="Search by source or description"
                                        className="anomalies-search-input"
                                    />
                                </div>

                                <div className="anomalies-filter-group">
                                    <label>Severity</label>
                                    <select className="anomalies-select">
                                        <option>All</option>
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                </div>

                                <div className="anomalies-filter-group">
                                    <label>Source</label>
                                    <select className="anomalies-select">
                                        <option>All</option>
                                        <option>Tank A</option>
                                        <option>Tank B</option>
                                        <option>Tank C</option>
                                        <option>Tank D</option>
                                    </select>
                                </div>

                                <div className="anomalies-filter-group">
                                    <label>Status</label>
                                    <select className="anomalies-select">
                                        <option>All</option>
                                        <option>Unresolved</option>
                                        <option>Investigating</option>
                                        <option>Resolved</option>
                                    </select>
                                </div>

                                <div className="anomalies-filter-action">
                                    <button className="anomalies-clear-btn" type="button">
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="anomalies-panel anomalies-table-panel">
                            <div className="anomalies-table-wrap">
                                <table className="anomalies-table">
                                    <thead>
                                        <tr>
                                            <th>Time Detected</th>
                                            <th>Source</th>
                                            <th>Description</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                            <th>Value</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {anomalyRows.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.time}</td>
                                                <td>{row.source}</td>
                                                <td>{row.description}</td>
                                                <td>
                                                    <span className={`anomaly-table-badge ${getSeverityClass(row.severity)}`}>
                                                        {row.severity}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`anomaly-table-badge ${getStatusClass(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td>{row.value}</td>
                                                <td>
                                                    <div className="anomalies-actions">
                                                        <button type="button" className="anomalies-icon-btn">
                                                            View
                                                        </button>
                                                        <button type="button" className="anomalies-icon-btn">
                                                            •••
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="anomalies-table-footer">
                                <p>Showing 1 to 6 of 24 results</p>

                                <div className="anomalies-pagination">
                                    <button type="button" className="anomalies-page-btn">‹</button>
                                    <button type="button" className="anomalies-page-btn active">1</button>
                                    <button type="button" className="anomalies-page-btn">2</button>
                                    <button type="button" className="anomalies-page-btn">3</button>
                                    <button type="button" className="anomalies-page-btn">›</button>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}