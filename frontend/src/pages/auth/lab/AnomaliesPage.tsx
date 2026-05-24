import { useMemo, useState, type FormEvent } from "react";
import { Archive, CheckCircle2, Eye, Plus, Sparkles, Trash2, X } from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/anomalies.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import {
    anomalyInputTags,
    createManualAnomalyDraft,
    detectedAnomalyRows,
    resolvedAnomalyRows,
    toAnomalyRow,
    type AnomalyRow,
    type AnomalySeverity,
} from "../../../services/anomalyPlaceholders";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import { formatCurrentDate, formatCurrentDateTime } from "../../../services/time";

type SummaryCard = {
    label: string;
    value: string;
    meta: string;
    status: "high" | "medium" | "low";
};

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
    const [anomalies, setAnomalies] = useState<AnomalyRow[]>(detectedAnomalyRows);
    const [resolvedArchive, setResolvedArchive] =
        useState<AnomalyRow[]>(resolvedAnomalyRows);
    const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRow | null>(null);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiAnomaly, setAiAnomaly] = useState<AnomalyRow | null>(null);
    const [resolvedPopupOpen, setResolvedPopupOpen] = useState(false);
    const [manualPopupOpen, setManualPopupOpen] = useState(false);
    const [manualDraft, setManualDraft] = useState(createManualAnomalyDraft);

    const allResolvedCases = useMemo(() => resolvedArchive, [resolvedArchive]);

    const summaryCards: SummaryCard[] = useMemo(() => {
        const total = anomalies.length;
        const high = anomalies.filter((item) => item.severity === "high").length;
        const medium = anomalies.filter((item) => item.severity === "medium").length;
        const low = anomalies.filter((item) => item.severity === "low").length;
        const active = anomalies.filter((item) => item.status !== "resolved").length;

        return [
            {
                label: "Total Anomalies",
                value: String(total),
                meta: `${active} active cases`,
                status: "high",
            },
            {
                label: "High Severity",
                value: String(high),
                meta: total ? `${Math.round((high / total) * 100)}% of total` : "No high severity cases",
                status: "high",
            },
            {
                label: "Medium Severity",
                value: String(medium),
                meta: total ? `${Math.round((medium / total) * 100)}% of total` : "No medium severity cases",
                status: "medium",
            },
            {
                label: "Low Severity",
                value: String(low),
                meta: total ? `${Math.round((low / total) * 100)}% of total` : "No low severity cases",
                status: "low",
            },
        ];
    }, [anomalies]);

    function handleResolve(id: number) {
        const resolvedTime = formatCurrentDateTime();
        const target = anomalies.find((item) => item.id === id);

        if (!target) return;

        const resolvedCase: AnomalyRow = {
            ...target,
            status: "resolved",
            resolvedAt: resolvedTime,
        };

        setResolvedArchive((prev) => {
            const alreadyExists = prev.some((item) => item.id === id);
            return alreadyExists ? prev : [resolvedCase, ...prev];
        });

        setAnomalies((prev) => prev.filter((item) => item.id !== id));
        setSelectedAnomaly(null);
    }

    function openAiRecommendation(row: AnomalyRow | null) {
        setAiAnomaly(row);
        setAiOpen(true);
    }

    function handleManualSubmit(event: FormEvent) {
        event.preventDefault();
        setAnomalies((prev) => [toAnomalyRow(manualDraft), ...prev]);
        setManualDraft(createManualAnomalyDraft());
        setManualPopupOpen(false);
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
                                    {formatCurrentDate()}
                                </button>

                                <button className="anomalies-filter-btn" type="button">
                                    {RAINWATER_TANK_NAME}
                                </button>

                                <button
                                    type="button"
                                    className="anomalies-filter-btn"
                                    onClick={() => {
                                        setManualDraft(createManualAnomalyDraft());
                                        setManualPopupOpen(true);
                                    }}
                                >
                                    <Plus size={16} />
                                    Add Anomaly
                                </button>

                                <button
                                    type="button"
                                    className="anomalies-sparkle-btn"
                                    onClick={() => openAiRecommendation(null)}
                                    title="AI recommendation readiness"
                                >
                                    <Sparkles size={18} />
                                </button>

                                <button
                                    type="button"
                                    className="anomalies-resolved-icon-btn"
                                    onClick={() => setResolvedPopupOpen(true)}
                                    title="Resolved cases"
                                >
                                    <Archive size={18} />
                                    <span>{allResolvedCases.length}</span>
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
                            {anomalies.length === 0 ? (
                                <div className="empty-state">
                                    <strong>No anomalies recorded yet</strong>
                                    <span>
                                        Detected sensor anomalies and manually reported camera observations will appear here.
                                    </span>
                                </div>
                            ) : (
                                <>
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
                                                                    title="View anomaly"
                                                                    aria-label="View anomaly"
                                                                    onClick={() => setSelectedAnomaly(row)}
                                                                >
                                                                    <Eye size={15} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="anomalies-sparkle-btn"
                                                                    onClick={() => openAiRecommendation(row)}
                                                                    title="AI recommendation"
                                                                >
                                                                    <Sparkles size={16} />
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
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                </main>
            </div>

            {resolvedPopupOpen && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card resolved">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>Resolved Cases</h2>
                                <p>{allResolvedCases.length} case{allResolvedCases.length !== 1 ? "s" : ""} in history</p>
                            </div>

                            <button
                                type="button"
                                className="anomalies-popup-close"
                                onClick={() => setResolvedPopupOpen(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {allResolvedCases.length === 0 ? (
                            <div className="empty-state compact">
                                <strong>No resolved cases</strong>
                                <span>Mark anomalies as resolved to archive them here.</span>
                            </div>
                        ) : (
                            <div className="anomalies-resolved-list">
                                {allResolvedCases.map((item) => (
                                    <article key={item.id} className="anomalies-resolved-item">
                                        <div className="anomalies-resolved-icon">
                                            <CheckCircle2 size={18} />
                                        </div>

                                        <div className="anomalies-resolved-content">
                                            <div className="anomalies-resolved-top">
                                                <h3>{item.source}</h3>
                                                <span className={`anomaly-table-badge ${getSeverityClass(item.severity)}`}>
                                                    {item.severity}
                                                </span>
                                            </div>

                                            <p>{item.description}</p>

                                            <div className="anomalies-resolved-meta">
                                                <span>Detected: {item.time}</span>
                                                <span>Resolved: {item.resolvedAt || "N/A"}</span>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        <div className="anomalies-popup-actions">
                            {allResolvedCases.length > 0 && (
                                <button
                                    type="button"
                                    className="anomalies-clear-btn"
                                    onClick={() => setResolvedArchive([])}
                                >
                                    <Trash2 size={14} />
                                    Clear History
                                </button>
                            )}
                            <button
                                type="button"
                                className="anomalies-resolve-btn"
                                onClick={() => setResolvedPopupOpen(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                aria-label="Close"
                            >
                                <X size={16} />
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
                                <span>Source Tag</span>
                                <strong>{selectedAnomaly.sourceTag}</strong>
                            </div>
                        </div>

                        <div className="anomalies-popup-section">
                            <h3>Description</h3>
                            <p>{selectedAnomaly.description}</p>
                        </div>

                        {selectedAnomaly.cameraReference && (
                            <div className="anomalies-popup-section">
                                <h3>Camera/Image Reference</h3>
                                <p>{selectedAnomaly.cameraReference}</p>
                            </div>
                        )}

                        <div className="anomalies-popup-note">
                            Physical inspection and backend persistence are still required before this anomaly can become a trusted operational record.
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

            {aiOpen && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card ai">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>AI Recommendation</h2>
                                <p>Prepared for ML-generated anomaly explanation and actions.</p>
                            </div>

                            <button
                                type="button"
                                className="anomalies-popup-close"
                                onClick={() => setAiOpen(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="anomalies-ai-chat">
                            <div className="anomalies-ai-message assistant">
                                <strong>Raincatcher AI</strong>
                                <p>
                                    {aiAnomaly
                                        ? aiAnomaly.recommendation.message
                                        : "AI recommendations will be generated after the anomaly model is connected."}
                                </p>
                            </div>

                            <div className="anomalies-ai-message case">
                                <strong>Model inputs later</strong>
                                <p>
                                    Sensor readings, captured camera images, anomaly descriptions, and historical anomaly cases.
                                </p>
                            </div>

                            {aiAnomaly && (
                                <div className="anomalies-ai-message case">
                                    <strong>Selected case</strong>
                                    <p>{aiAnomaly.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="anomalies-popup-actions">
                            <button
                                type="button"
                                className="anomalies-clear-btn"
                                onClick={() => setAiOpen(false)}
                            >
                                Close
                            </button>

                            {aiAnomaly && (
                                <button
                                    type="button"
                                    className="anomalies-resolve-btn"
                                    onClick={() => {
                                        setSelectedAnomaly(aiAnomaly);
                                        setAiOpen(false);
                                    }}
                                >
                                    View Case
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {manualPopupOpen && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>Report Anomaly</h2>
                                <p>Add a manual observation from the live camera or physical inspection.</p>
                            </div>

                            <button
                                type="button"
                                className="anomalies-popup-close"
                                onClick={() => setManualPopupOpen(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form className="anomalies-form-grid" onSubmit={handleManualSubmit}>
                            <label className="anomalies-form-field">
                                Anomaly title
                                <input
                                    value={manualDraft.title}
                                    onChange={(event) =>
                                        setManualDraft((prev) => ({ ...prev, title: event.target.value }))
                                    }
                                    placeholder="e.g. Sediment visible near inlet"
                                />
                            </label>

                            <label className="anomalies-form-field">
                                Severity
                                <select
                                    value={manualDraft.severity}
                                    onChange={(event) =>
                                        setManualDraft((prev) => ({
                                            ...prev,
                                            severity: event.target.value as AnomalySeverity,
                                        }))
                                    }
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </label>

                            <label className="anomalies-form-field">
                                Related sensor/source
                                <select
                                    value={manualDraft.sourceTag}
                                    onChange={(event) =>
                                        setManualDraft((prev) => ({
                                            ...prev,
                                            sourceTag: event.target.value as typeof manualDraft.sourceTag,
                                        }))
                                    }
                                >
                                    {anomalyInputTags.map((tag) => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="anomalies-form-field">
                                Timestamp
                                <input
                                    value={manualDraft.timestamp}
                                    onChange={(event) =>
                                        setManualDraft((prev) => ({ ...prev, timestamp: event.target.value }))
                                    }
                                />
                            </label>

                            <label className="anomalies-form-field full">
                                Description
                                <textarea
                                    value={manualDraft.description}
                                    onChange={(event) =>
                                        setManualDraft((prev) => ({ ...prev, description: event.target.value }))
                                    }
                                    placeholder="Describe what the Lab Assistant observed from the feed or site inspection."
                                />
                            </label>

                            <label className="anomalies-form-field full">
                                Optional camera/image reference
                                <input
                                    value={manualDraft.cameraReference}
                                    onChange={(event) =>
                                        setManualDraft((prev) => ({ ...prev, cameraReference: event.target.value }))
                                    }
                                    placeholder="Camera capture ID or image path placeholder"
                                />
                            </label>

                            <div className="anomalies-popup-actions full">
                                <button
                                    type="button"
                                    className="anomalies-clear-btn"
                                    onClick={() => setManualPopupOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="anomalies-resolve-btn">
                                    Add Anomaly
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

