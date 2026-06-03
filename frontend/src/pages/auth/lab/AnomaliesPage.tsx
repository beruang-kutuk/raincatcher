import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Camera, CheckCircle2, Eye, Plus, Scan, Sparkles, Trash2, X } from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/anomalies.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import {
    analyseCameraRecord,
    getLatestAnalysisRecord,
    getLatestYoloRecord,
    runYoloCameraRecord,
    type CameraRecord,
} from "../../../services/cameraRecordsApi";
import {
    anomalyInputTags,
    createManualAnomalyDraft,
    type AnomalyRow,
    type AnomalySeverity,
} from "../../../services/anomalyPlaceholders";
import {
    createAnomaly,
    getAnomalies,
    updateAnomaly,
    type BackendAnomaly,
} from "../../../services/anomalyApi";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import { formatCurrentDate, formatCurrentDateTime } from "../../../services/time";

type SummaryCard = {
    label: string;
    value: string;
    meta: string;
    status: "high" | "medium" | "low";
};

const CAMERA_OFFLINE_MESSAGE = "Raspberry Pi camera service unavailable. Make sure camera_ml_backend.py is running.";
const YOLO_OFFLINE_MESSAGE = "Live feed connected. YOLO unavailable.";

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
                <span className={`status-pill ${getSeverityClass(status)}`}>{status}</span>
            </div>
            <p className="anomalies-summary-meta">{meta}</p>
        </div>
    );
}

function normaliseCameraSeverity(analysis: CameraRecord | null): "low" | "medium" | "high" {
    if (!analysis) return "low";
    const severity = analysis.severity?.toLowerCase() ?? "low";
    if (severity === "high" || analysis.status === "blocked_or_unusable") return "high";
    if (severity === "medium" || analysis.status === "overexposed" || analysis.status === "too_dark" || analysis.status === "blurry") {
        return "medium";
    }
    return "low";
}

function getCameraWorkflowRecommendation(analysis: CameraRecord | null) {
    if (!analysis) return "No saved camera analysis yet. Run Camera ML Check to save a real Raspberry Pi image-quality result.";
    switch (analysis.status) {
        case "normal": return `Low severity: ${analysis.aiRecommendation}`;
        case "blocked_or_unusable": return "Camera image is blocked or unusable. Check the camera position, lens, and view of the Rainwater Tank.";
        case "overexposed": return "Camera image is overexposed. Reduce glare or adjust the camera angle.";
        case "too_dark": return "Camera image is too dark. Improve lighting near the Rainwater Tank.";
        case "blurry": return "Camera image is blurry. Clean or refocus the camera lens.";
        default: return analysis.aiRecommendation ?? "Camera analysis record is saved, but no recommendation was returned.";
    }
}

function formatCameraMetric(value: number | null | undefined) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return value < 1 ? value.toFixed(4) : value.toFixed(2);
}

function yoloVisualStatusToSeverity(visualStatus: string | null | undefined): "low" | "medium" | "high" {
    if (visualStatus === "person_detected") return "medium";
    if (visualStatus === "object_detected") return "low";
    return "low";
}

function formatReadableStatus(value: string | null | undefined) {
    if (!value) return "--";
    return value
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseDetections(record: CameraRecord | null): Array<{ label?: string; confidence?: number }> {
    if (!record?.detectionsJson) return [];
    try {
        const detections = JSON.parse(record.detectionsJson) as Array<{ label?: string; confidence?: number }>;
        return Array.isArray(detections) ? detections : [];
    } catch {
        return [];
    }
}

function toFrontendAnomaly(row: BackendAnomaly): AnomalyRow {
    const severity = row.severity === "high" || row.severity === "medium" || row.severity === "low"
        ? row.severity
        : "medium";
    const status = row.status === "investigating" || row.status === "resolved" ? row.status : "unresolved";

    return {
        id: row.id ?? Date.now(),
        time: row.createdAt ?? formatCurrentDateTime(),
        source: row.source ?? `${RAINWATER_TANK_NAME} - Backend Anomaly`,
        sourceTag: (row.sourceTag as AnomalyRow["sourceTag"]) ?? "manual_observation",
        title: row.title ?? "Anomaly",
        description: row.description ?? "Anomaly details unavailable.",
        severity,
        status,
        value: row.valueText ?? "--",
        cameraReference: row.cameraRecordId ? `Camera record ${row.cameraRecordId}` : undefined,
        recommendation: {
            status: "placeholder",
            modelInputs: ["backend_anomaly_record"],
            message: row.recommendation ?? "Review this anomaly using persisted backend data.",
        },
        resolvedAt: row.resolvedAt ?? undefined,
    };
}

export default function AnomaliesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [anomalies, setAnomalies] = useState<AnomalyRow[]>([]);
    const [resolvedArchive, setResolvedArchive] = useState<AnomalyRow[]>([]);
    const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRow | null>(null);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiAnomaly, setAiAnomaly] = useState<AnomalyRow | null>(null);
    const [resolvedPopupOpen, setResolvedPopupOpen] = useState(false);
    const [manualPopupOpen, setManualPopupOpen] = useState(false);
    const [manualDraft, setManualDraft] = useState(createManualAnomalyDraft);

    // Camera ML (basic) — separate from YOLO
    const [cameraAnalysis, setCameraAnalysis] = useState<CameraRecord | null>(null);
    const [cameraMlLoading, setCameraMlLoading] = useState(false);
    const [cameraMlError, setCameraMlError] = useState("");

    // YOLO — separate from basic Camera ML
    const [yoloResult, setYoloResult] = useState<CameraRecord | null>(null);
    const [yoloLoading, setYoloLoading] = useState(false);
    const [yoloError, setYoloError] = useState("");

    const [anomalyError, setAnomalyError] = useState("");

    const allResolvedCases = useMemo(() => resolvedArchive, [resolvedArchive]);
    const cameraSeverity = normaliseCameraSeverity(cameraAnalysis);
    const cameraWorkflowRecommendation = getCameraWorkflowRecommendation(cameraAnalysis);

    // Fetch persisted anomalies. Telemetry threshold anomalies are created by the backend on ESP32 POST.
    useEffect(() => {
        let active = true;

        async function loadPersistedAnomalies() {
            try {
                const rows = await getAnomalies();
                if (!active) return;
                const mapped = rows.map(toFrontendAnomaly);
                setAnomalies(mapped.filter((row) => row.status !== "resolved"));
                setResolvedArchive(mapped.filter((row) => row.status === "resolved"));
                setAnomalyError("");
            } catch {
                if (active) setAnomalyError("Backend anomalies unavailable.");
            }
        }

        void loadPersistedAnomalies();
        const intervalId = window.setInterval(loadPersistedAnomalies, 5000);
        return () => {
            active = false;
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        let active = true;

        async function loadSavedCameraRecords() {
            const [latestAnalysis, latestYolo] = await Promise.allSettled([
                getLatestAnalysisRecord(),
                getLatestYoloRecord(),
            ]);

            if (!active) return;
            if (latestAnalysis.status === "fulfilled") setCameraAnalysis(latestAnalysis.value);
            if (latestYolo.status === "fulfilled") setYoloResult(latestYolo.value);
        }

        void loadSavedCameraRecords();
        return () => { active = false; };
    }, []);

    const summaryCards: SummaryCard[] = useMemo(() => {
        const total = anomalies.length;
        const high = anomalies.filter((item) => item.severity === "high").length;
        const medium = anomalies.filter((item) => item.severity === "medium").length;
        const low = anomalies.filter((item) => item.severity === "low").length;
        const active = anomalies.filter((item) => item.status !== "resolved").length;

        return [
            { label: "Total Anomalies", value: String(total), meta: `${active} active cases`, status: "high" },
            { label: "High Severity", value: String(high), meta: total ? `${Math.round((high / total) * 100)}% of total` : "No high severity cases", status: "high" },
            { label: "Medium Severity", value: String(medium), meta: total ? `${Math.round((medium / total) * 100)}% of total` : "No medium severity cases", status: "medium" },
            { label: "Low Severity", value: String(low), meta: total ? `${Math.round((low / total) * 100)}% of total` : "No low severity cases", status: "low" },
        ];
    }, [anomalies]);

    const allAnomalies = useMemo(() => anomalies, [anomalies]);

    async function handleResolve(id: number) {
        const resolvedTime = formatCurrentDateTime();
        const target = allAnomalies.find((item) => item.id === id);
        if (!target) return;

        let resolvedCase: AnomalyRow = { ...target, status: "resolved", resolvedAt: resolvedTime };

        try {
            const saved = await updateAnomaly(id, { status: "resolved" });
            resolvedCase = toFrontendAnomaly(saved);
            setAnomalyError("");
        } catch {
            setAnomalyError("Unable to update anomaly status in backend.");
            return;
        }

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
        void runCameraMlCheck();
    }

    async function handleManualSubmit(event: FormEvent) {
        event.preventDefault();
        try {
            const saved = await createAnomaly({
                tankId: "rainwater-tank",
                source:
                    manualDraft.sourceTag === "camera_capture"
                        ? `${RAINWATER_TANK_NAME} - Camera`
                        : manualDraft.sourceTag === "manual_observation"
                            ? `${RAINWATER_TANK_NAME} - Manual Observation`
                            : `${RAINWATER_TANK_NAME} - ${manualDraft.sourceTag}`,
                sourceTag: manualDraft.sourceTag,
                title: manualDraft.title.trim() || "Manual anomaly",
                description: manualDraft.description.trim() || "Manual anomaly awaiting detailed notes.",
                severity: manualDraft.severity,
                status: "unresolved",
                valueText: "Manual observation",
                recommendation: "Review the physical inspection notes and compare with latest ESP32 telemetry/camera records.",
            });
            setAnomalies((prev) => [toFrontendAnomaly(saved), ...prev]);
            setAnomalyError("");
            setManualDraft(createManualAnomalyDraft());
            setManualPopupOpen(false);
        } catch {
            setAnomalyError("Unable to save manual anomaly to backend.");
        }
    }

    async function runCameraMlCheck() {
        setCameraMlLoading(true);
        setCameraMlError("");
        try {
            const analysis = await analyseCameraRecord();
            setCameraAnalysis(analysis);
        } catch {
            setCameraAnalysis(null);
            setCameraMlError(CAMERA_OFFLINE_MESSAGE);
        } finally {
            setCameraMlLoading(false);
        }
    }

    async function runYoloCheck() {
        setYoloLoading(true);
        setYoloError("");
        try {
            const result = await runYoloCameraRecord();
            setYoloResult(result);
        } catch {
            setYoloResult(null);
            setYoloError(YOLO_OFFLINE_MESSAGE);
        } finally {
            setYoloLoading(false);
        }
    }

    const yolo = yoloResult;
    const yoloSeverity = yolo ? yoloVisualStatusToSeverity(yolo.visualStatus) : "low";
    const yoloDetections = parseDetections(yolo);

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="anomalies-page page-container">
                        <div className="anomalies-topbar">
                            <div>
                                <h1 className="anomalies-page-title">Anomalies</h1>
                            </div>

                            <div className="anomalies-topbar-right">
                                <button className="anomalies-filter-btn" type="button">{formatCurrentDate()}</button>
                                <button className="anomalies-filter-btn" type="button">{RAINWATER_TANK_NAME}</button>

                                <button type="button" className="anomalies-filter-btn"
                                    onClick={() => { setManualDraft(createManualAnomalyDraft()); setManualPopupOpen(true); }}>
                                    <Plus size={16} /> Add Anomaly
                                </button>

                                <button type="button" className="anomalies-sparkle-btn"
                                    onClick={() => openAiRecommendation(null)} title="AI recommendation readiness">
                                    <Sparkles size={18} />
                                </button>

                                <button type="button" className="anomalies-filter-btn"
                                    onClick={() => { setAiAnomaly(null); setAiOpen(true); void runCameraMlCheck(); }}
                                    disabled={cameraMlLoading}>
                                    <Camera size={16} />
                                    {cameraMlLoading ? "Checking..." : "Camera ML Check"}
                                </button>

                                <button type="button" className="anomalies-filter-btn"
                                    onClick={runYoloCheck} disabled={yoloLoading}>
                                    <Scan size={16} />
                                    {yoloLoading ? "Detecting..." : "YOLO Check"}
                                </button>

                                <button type="button" className="anomalies-resolved-icon-btn"
                                    onClick={() => setResolvedPopupOpen(true)} title="Resolved cases">
                                    <Archive size={18} />
                                    <span>{allResolvedCases.length}</span>
                                </button>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>
                        </div>

                        <div className="anomalies-summary-grid">
                            {summaryCards.map((item) => <SummaryStatCard key={item.label} {...item} />)}
                        </div>

                        {anomalyError && (
                            <div className="anomalies-camera-ml-offline anomalies-backend-error">{anomalyError}</div>
                        )}

                        {/* Basic Camera ML Check panel */}
                        <section className="anomalies-panel anomalies-camera-ml-panel">
                            <div className="anomalies-camera-ml-top">
                                <div>
                                    <h2>Camera ML Check</h2>
                                    <p>Raspberry Pi basic image-quality analysis for {RAINWATER_TANK_NAME}.</p>
                                </div>
                                <button type="button" className="anomalies-clear-btn" onClick={runCameraMlCheck} disabled={cameraMlLoading}>
                                    <Camera size={14} />
                                    {cameraMlLoading ? "Checking..." : "Run Check"}
                                </button>
                            </div>

                            {cameraMlError ? (
                                <div className="anomalies-camera-ml-offline">{cameraMlError}</div>
                            ) : (
                                <div className="anomalies-camera-ml-grid">
                                    <div><span>Status</span><strong>{cameraAnalysis?.status ?? "--"}</strong></div>
                                    <div>
                                        <span>Severity</span>
                                        <strong className={`anomaly-table-badge ${getSeverityClass(cameraSeverity)}`}>
                                            {cameraAnalysis?.severity ?? "pending"}
                                        </strong>
                                    </div>
                                    <div><span>Brightness</span><strong>{formatCameraMetric(cameraAnalysis?.brightness)}</strong></div>
                                    <div><span>Blur Score</span><strong>{formatCameraMetric(cameraAnalysis?.blurScore)}</strong></div>
                                    <div><span>Timestamp</span><strong>{cameraAnalysis?.createdAt ?? "--"}</strong></div>
                                </div>
                            )}

                            <div className="anomalies-camera-ml-recommendation">
                                <Sparkles size={16} />
                                <span>{cameraMlError || cameraWorkflowRecommendation}</span>
                            </div>
                        </section>

                        {/* YOLO Check panel — separate from basic Camera ML */}
                        <section className="anomalies-panel anomalies-camera-ml-panel">
                            <div className="anomalies-camera-ml-top">
                                <div>
                                    <h2>Camera YOLO Check</h2>
                                    <p>Object detection using YOLO model on the Raspberry Pi camera.</p>
                                </div>
                                <button type="button" className="anomalies-clear-btn" onClick={runYoloCheck} disabled={yoloLoading}>
                                    <Scan size={14} />
                                    {yoloLoading ? "Detecting..." : "Run YOLO"}
                                </button>
                            </div>

                            {yoloError ? (
                                <div className="anomalies-camera-ml-offline yolo-offline-message">{yoloError}</div>
                            ) : yolo ? (
                                <>
                                    <div className="anomalies-camera-ml-grid">
                                        <div><span>Model</span><strong>{yolo.yoloModel ?? "--"}</strong></div>
                                        <div>
                                            <span>Visual Status</span>
                                            <strong className={`anomaly-table-badge ${getSeverityClass(yoloSeverity)}`}>
                                                {formatReadableStatus(yolo.visualStatus)}
                                            </strong>
                                        </div>
                                        <div><span>Detections</span><strong>{yolo.detectionCount ?? "--"}</strong></div>
                                        <div>
                                            <span>Severity</span>
                                            <strong className={`anomaly-table-badge ${getSeverityClass(yoloSeverity)}`}>
                                                {yolo.severity}
                                            </strong>
                                        </div>
                                        <div><span>Timestamp</span><strong>{yolo.createdAt ?? "--"}</strong></div>
                                    </div>

                                    {yoloDetections.length > 0 && (
                                        <div className="yolo-detection-list" style={{ marginTop: "10px" }}>
                                            {yoloDetections.map((det, idx) => (
                                                <span key={idx} className="yolo-detection-pill">
                                                    {formatReadableStatus(det.label ?? "object")} ({((det.confidence ?? 0) * 100).toFixed(0)}%)
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="anomalies-camera-ml-recommendation">
                                        <Sparkles size={16} />
                                        <span>{yolo.aiRecommendation}</span>
                                    </div>

                                    {yolo.futureNote && (
                                        <div className="yolo-result-meta" style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>
                                            <p>{yolo.futureNote}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="anomalies-camera-ml-recommendation">
                                    <Sparkles size={16} />
                                    <span>Run YOLO Check to detect objects in the Raspberry Pi camera view.</span>
                                </div>
                            )}
                        </section>

                        <section className="anomalies-panel anomalies-filters-panel">
                            <div className="anomalies-filters-grid">
                                <div className="anomalies-filter-group anomalies-filter-search">
                                    <label>Search anomaly</label>
                                    <input type="text" placeholder="Search by source or description" className="anomalies-search-input" />
                                </div>
                                <div className="anomalies-filter-group">
                                    <label>Severity</label>
                                    <select className="anomalies-select">
                                        <option>All</option><option>High</option><option>Medium</option><option>Low</option>
                                    </select>
                                </div>
                                <div className="anomalies-filter-group">
                                    <label>Status</label>
                                    <select className="anomalies-select">
                                        <option>All</option><option>Unresolved</option><option>Investigating</option><option>Resolved</option>
                                    </select>
                                </div>
                                <div className="anomalies-filter-action">
                                    <button className="anomalies-clear-btn" type="button">Clear Filters</button>
                                </div>
                            </div>
                        </section>

                        <section className="anomalies-panel anomalies-table-panel">
                            {allAnomalies.length === 0 ? (
                                <div className="empty-state">
                                    <strong>No anomalies recorded yet</strong>
                                    <span>Detected sensor anomalies and manually reported camera observations will appear here.</span>
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
                                                {allAnomalies.map((row) => (
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
                                                                <button type="button" className="anomalies-icon-btn" title="View anomaly"
                                                                    aria-label="View anomaly" onClick={() => setSelectedAnomaly(row)}>
                                                                    <Eye size={15} />
                                                                </button>
                                                                <button type="button" className="anomalies-sparkle-btn"
                                                                    onClick={() => openAiRecommendation(row)} title="AI recommendation">
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
                                        <p>Showing 1 to {allAnomalies.length} of {allAnomalies.length} results</p>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                </main>
            </div>

            {/* Resolved cases popup */}
            {resolvedPopupOpen && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card resolved">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>Resolved Cases</h2>
                                <p>{allResolvedCases.length} case{allResolvedCases.length !== 1 ? "s" : ""} in history</p>
                            </div>
                            <button type="button" className="anomalies-popup-close" onClick={() => setResolvedPopupOpen(false)} aria-label="Close">
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
                                        <div className="anomalies-resolved-icon"><CheckCircle2 size={18} /></div>
                                        <div className="anomalies-resolved-content">
                                            <div className="anomalies-resolved-top">
                                                <h3>{item.source}</h3>
                                                <span className={`anomaly-table-badge ${getSeverityClass(item.severity)}`}>{item.severity}</span>
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
                                <button type="button" className="anomalies-clear-btn" onClick={() => setResolvedArchive([])}>
                                    <Trash2 size={14} /> Clear History
                                </button>
                            )}
                            <button type="button" className="anomalies-resolve-btn" onClick={() => setResolvedPopupOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Anomaly detail popup */}
            {selectedAnomaly && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>Anomaly Case Details</h2>
                                <p>{selectedAnomaly.source}</p>
                            </div>
                            <button type="button" className="anomalies-popup-close" onClick={() => setSelectedAnomaly(null)} aria-label="Close">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="anomalies-popup-grid">
                            <div><span>Time Detected</span><strong>{selectedAnomaly.time}</strong></div>
                            <div><span>Severity</span><strong>{selectedAnomaly.severity}</strong></div>
                            <div><span>Status</span><strong>{selectedAnomaly.status}</strong></div>
                            <div><span>Source Tag</span><strong>{selectedAnomaly.sourceTag}</strong></div>
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
                            <button type="button" className="anomalies-clear-btn" onClick={() => setSelectedAnomaly(null)}>Close</button>
                            <button type="button" className="anomalies-resolve-btn"
                                disabled={selectedAnomaly.status === "resolved"}
                                onClick={() => handleResolve(selectedAnomaly.id)}>
                                {selectedAnomaly.status === "resolved" ? "Already Resolved" : "Mark as Resolved"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Recommendation popup */}
            {aiOpen && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card ai">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>AI Recommendation</h2>
                                <p>Prepared for ML-generated anomaly explanation and actions.</p>
                            </div>
                            <button type="button" className="anomalies-popup-close" onClick={() => setAiOpen(false)} aria-label="Close">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="anomalies-ai-chat">
                            <div className="anomalies-ai-message assistant">
                                <strong>Raincatcher AI</strong>
                                <p>
                                    {cameraMlError
                                        ? cameraMlError
                                        : aiAnomaly
                                            ? `${aiAnomaly.recommendation.message} Camera ML: ${cameraWorkflowRecommendation}`
                                            : cameraWorkflowRecommendation}
                                </p>
                            </div>

                            <div className="anomalies-ai-message case">
                                <strong>Camera ML analysis</strong>
                                <p>
                                    {cameraMlLoading
                                        ? "Checking Raspberry Pi camera ML service..."
                                        : cameraAnalysis
                                            ? `Status: ${cameraAnalysis.status}. Severity: ${cameraAnalysis.severity}. Brightness: ${formatCameraMetric(cameraAnalysis.brightness)}. Blur score: ${formatCameraMetric(cameraAnalysis.blurScore)}.`
                                            : "No camera ML result loaded yet."}
                                </p>
                            </div>

                            {yolo && (
                                <div className="anomalies-ai-message case">
                                    <strong>YOLO Detection</strong>
                                    <p>
                                        {`Visual status: ${formatReadableStatus(yolo.visualStatus ?? "unavailable")}. Detections: ${yolo.detectionCount ?? 0}. ${yolo.aiRecommendation ?? ""}`}
                                    </p>
                                </div>
                            )}

                            {aiAnomaly && (
                                <div className="anomalies-ai-message case">
                                    <strong>Selected case</strong>
                                    <p>{aiAnomaly.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="anomalies-popup-actions">
                            <button type="button" className="anomalies-clear-btn" onClick={() => setAiOpen(false)}>Close</button>
                            {aiAnomaly && (
                                <button type="button" className="anomalies-resolve-btn"
                                    onClick={() => { setSelectedAnomaly(aiAnomaly); setAiOpen(false); }}>
                                    View Case
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manual anomaly report popup */}
            {manualPopupOpen && (
                <div className="anomalies-popup-backdrop">
                    <div className="anomalies-popup-card">
                        <div className="anomalies-popup-header">
                            <div>
                                <h2>Report Anomaly</h2>
                                <p>Add a manual observation from the live camera or physical inspection.</p>
                            </div>
                            <button type="button" className="anomalies-popup-close" onClick={() => setManualPopupOpen(false)} aria-label="Close">
                                <X size={16} />
                            </button>
                        </div>

                        <form className="anomalies-form-grid" onSubmit={handleManualSubmit}>
                            <label className="anomalies-form-field">
                                Anomaly title
                                <input value={manualDraft.title}
                                    onChange={(event) => setManualDraft((prev) => ({ ...prev, title: event.target.value }))}
                                    placeholder="e.g. Sediment visible near inlet" />
                            </label>

                            <label className="anomalies-form-field">
                                Severity
                                <select value={manualDraft.severity}
                                    onChange={(event) => setManualDraft((prev) => ({ ...prev, severity: event.target.value as AnomalySeverity }))}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </label>

                            <label className="anomalies-form-field">
                                Related sensor/source
                                <select value={manualDraft.sourceTag}
                                    onChange={(event) => setManualDraft((prev) => ({ ...prev, sourceTag: event.target.value as typeof manualDraft.sourceTag }))}>
                                    {anomalyInputTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                                </select>
                            </label>

                            <label className="anomalies-form-field">
                                Timestamp
                                <input value={manualDraft.timestamp}
                                    onChange={(event) => setManualDraft((prev) => ({ ...prev, timestamp: event.target.value }))} />
                            </label>

                            <label className="anomalies-form-field full">
                                Description
                                <textarea value={manualDraft.description}
                                    onChange={(event) => setManualDraft((prev) => ({ ...prev, description: event.target.value }))}
                                    placeholder="Describe what the Lab Assistant observed from the feed or site inspection." />
                            </label>

                            <label className="anomalies-form-field full">
                                Optional camera/image reference
                                <input value={manualDraft.cameraReference}
                                    onChange={(event) => setManualDraft((prev) => ({ ...prev, cameraReference: event.target.value }))}
                                    placeholder="Camera capture ID or image path placeholder" />
                            </label>

                            <div className="anomalies-popup-actions full">
                                <button type="button" className="anomalies-clear-btn" onClick={() => setManualPopupOpen(false)}>Cancel</button>
                                <button type="submit" className="anomalies-resolve-btn">Add Anomaly</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
