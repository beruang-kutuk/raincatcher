import { useMemo, useState } from "react";
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
    recommendation: string;
};

const initialAnomalies: AnomalyRow[] = [
    {
        id: 1,
        time: "21 Apr 2026, 10:42 AM",
        source: "Tank A - Water Level",
        description: "Water level dropped rapidly within a short period.",
        severity: "high",
        status: "unresolved",
        value: "-18.4 cm/min",
        recommendation:
            "Check for leakage around Tank A, inspect valve closure, and compare water level readings with recent usage logs. If the drop continues, temporarily disable usage from this tank and notify maintenance.",
    },
    {
        id: 2,
        time: "21 Apr 2026, 09:15 AM",
        source: "Tank B - Turbidity Sensor",
        description: "Turbidity level exceeded the normal monitoring threshold.",
        severity: "medium",
        status: "investigating",
        value: "18.9 NTU",
        recommendation:
            "Inspect inlet filter condition, check whether recent rainfall caused sediment inflow, and schedule filter cleaning. Continue monitoring turbidity for the next few readings before confirming normal status.",
    },
    {
        id: 3,
        time: "21 Apr 2026, 08:30 AM",
        source: "RC-01 Telemetry Unit",
        description: "Telemetry reading was delayed beyond expected reporting interval.",
        severity: "low",
        status: "unresolved",
        value: "35 min delay",
        recommendation:
            "Check device connectivity, confirm gateway signal strength, and verify that the telemetry unit has stable power. If delays repeat, restart the device and record the event in the report.",
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
    const [anomalies, setAnomalies] = useState<AnomalyRow[]>(initialAnomalies);
    const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRow | null>(null);
    const [aiAnomaly, setAiAnomaly] = useState<AnomalyRow | null>(null);

    const summaryCards: SummaryCard[] = useMemo(() => {
        const total = anomalies.length || 1;
        const high = anomalies.filter((item) => item.severity === "high").length;
        const medium = anomalies.filter((item) => item.severity === "medium").length;
        const low = anomalies.filter((item) => item.severity === "low").length;
        const active = anomalies.filter((item) => item.status !== "resolved").length;

        return [
            {
                label: "Total Anomalies",
                value: String(anomalies.length),
                meta: `${active} active cases`,
                status: "high",
            },
            {
                label: "High Severity",
                value: String(high),
                meta: `${Math.round((high / total) * 100)}% of total`,
                status: "high",
            },
            {
                label: "Medium Severity",
                value: String(medium),
                meta: `${Math.round((medium / total) * 100)}% of total`,
                status: "medium",
            },
            {
                label: "Low Severity",
                value: String(low),
                meta: `${Math.round((low / total) * 100)}% of total`,
                status: "low",
            },
        ];
    }, [anomalies]);

    function handleResolve(id: number) {
        setAnomalies((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, status: "resolved" } : item
            )
        );

        setSelectedAnomaly((prev) =>
            prev && prev.id === id ? { ...prev, status: "resolved" } : prev
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
                                        {anomalies.map((row) => (
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
                                                        <button
                                                            type="button"
                                                            className="anomalies-icon-btn"
                                                            onClick={() => setSelectedAnomaly(row)}
                                                        >
                                                            View
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="anomalies-sparkle-btn"
                                                            onClick={() => setAiAnomaly(row)}
                                                            title="AI recommendation"
                                                        >
                                                            ✦
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="anomalies-table-footer">
                                <p>
                                    Showing 1 to {anomalies.length} of {anomalies.length} results
                                </p>

                                <div className="anomalies-pagination">
                                    <button type="button" className="anomalies-page-btn active">
                                        1
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>

            {selectedAnomaly && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>Anomaly Case Details</h2>
                                <p>{selectedAnomaly.source}</p>
                            </div>

                            <button
                                type="button"
                                className="anomalies-popup-close"
                                onClick={() => setSelectedAnomaly(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="anomalies-popup-grid">
                            <div>
                                <span>Time Detected</span>
                                <strong>{selectedAnomaly.time}</strong>
                            </div>

                            <div>
                                <span>Severity</span>
                                <strong>{selectedAnomaly.severity}</strong>
                            </div>

                            <div>
                                <span>Status</span>
                                <strong>{selectedAnomaly.status}</strong>
                            </div>

                            <div>
                                <span>Value</span>
                                <strong>{selectedAnomaly.value}</strong>
                            </div>
                        </div>

                        <div className="anomalies-popup-section">
                            <h3>Description</h3>
                            <p>{selectedAnomaly.description}</p>
                        </div>

                        <div className="anomalies-popup-note">
                            Since hardware cannot be handled directly from the system, the case must be manually marked as resolved after physical inspection.
                        </div>

                        <div className="anomalies-popup-actions">
                            <button
                                type="button"
                                className="anomalies-clear-btn"
                                onClick={() => setSelectedAnomaly(null)}
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                className="anomalies-resolve-btn"
                                disabled={selectedAnomaly.status === "resolved"}
                                onClick={() => handleResolve(selectedAnomaly.id)}
                            >
                                {selectedAnomaly.status === "resolved"
                                    ? "Already Resolved"
                                    : "Mark as Resolved"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {aiAnomaly && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card ai">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>AI Recommendation</h2>
                                <p>Suggested prevention action</p>
                            </div>

                            <button
                                type="button"
                                className="anomalies-popup-close"
                                onClick={() => setAiAnomaly(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="anomalies-ai-chat">
                            <div className="anomalies-ai-message assistant">
                                <strong>✦ Raincatcher AI</strong>
                                <p>{aiAnomaly.recommendation}</p>
                            </div>

                            <div className="anomalies-ai-message case">
                                <strong>Selected case</strong>
                                <p>{aiAnomaly.description}</p>
                            </div>
                        </div>

                        <div className="anomalies-popup-actions">
                            <button
                                type="button"
                                className="anomalies-clear-btn"
                                onClick={() => setAiAnomaly(null)}
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                className="anomalies-resolve-btn"
                                onClick={() => {
                                    setSelectedAnomaly(aiAnomaly);
                                    setAiAnomaly(null);
                                }}
                            >
                                View Case
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}