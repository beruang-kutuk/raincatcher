import { useEffect, useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/tank-images.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import RpiCameraFeed from "../../../components/lab/RpiCameraFeed";
import { getLatestFrameUrl, getYoloFrameUrl } from "../../../services/cameraMlApi";
import {
    analyseCameraRecord,
    captureCameraRecord,
    checkCameraRecordHealth,
    getCameraRecordHistory,
    getLatestAnalysisRecord,
    getLatestYoloRecord,
    runYoloCameraRecord,
    withImageCacheBust,
    type CameraRecord,
    type CameraRecordHealth,
} from "../../../services/cameraRecordsApi";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import { formatCurrentDate, formatCurrentDateTime } from "../../../services/time";

type CapturedImageItem = {
    id: string;
    filename: string;
    filepath?: string;
    imageUrl: string;
    timestamp: string;
    tank: string;
    status?: string;
    severity?: string;
    recommendation?: string;
};

type DetectionPreview = {
    label?: string;
    confidence?: number;
};

function formatMetric(value: number | null | undefined, unit = "") {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    const formatted = value < 1 ? value.toFixed(4) : value.toFixed(2);
    return unit ? `${formatted} ${unit}` : formatted;
}

function buildCapturedImageItem(record: CameraRecord): CapturedImageItem {
    const timestamp = record.createdAt || formatCurrentDateTime();
    const recordLabel = record.recordType || "camera_record";
    const filename = `raincatcher_${recordLabel}_${record.id ?? Date.now()}.jpg`;

    return {
        id: `${record.id ?? filename}`,
        filename,
        filepath: record.futureNote ?? undefined,
        imageUrl: withImageCacheBust(record.imageUrl || getLatestFrameUrl()),
        timestamp,
        tank: record.tankId || RAINWATER_TANK_NAME,
        status: record.status || record.recordType || "saved",
        severity: record.severity || undefined,
        recommendation: record.aiRecommendation || undefined,
    };
}

function parseDetections(record: CameraRecord | null): DetectionPreview[] {
    if (!record?.detectionsJson) return [];

    try {
        const detections = JSON.parse(record.detectionsJson) as DetectionPreview[];
        return Array.isArray(detections) ? detections : [];
    } catch {
        return [];
    }
}

function getSeverityPillClass(severity: string | null | undefined) {
    if (severity === "high") return "high";
    if (severity === "medium") return "medium";
    if (severity === "low" || severity === "normal") return "low";
    return "pending";
}

function formatReadableStatus(value: string | null | undefined) {
    if (!value) return "--";
    return value
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TankImagesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [autoCapture, setAutoCapture] = useState(false);
    const [capturedImages, setCapturedImages] = useState<CapturedImageItem[]>([]);
    const [captureStatus, setCaptureStatus] = useState("Ready to capture from Raspberry Pi camera ML backend.");
    const [cameraHealth, setCameraHealth] = useState<CameraRecordHealth | null>(null);

    const [cameraAnalysis, setCameraAnalysis] = useState<CameraRecord | null>(null);
    const [cameraMlLoading, setCameraMlLoading] = useState(false);
    const [cameraMlError, setCameraMlError] = useState("");

    const [yoloResult, setYoloResult] = useState<CameraRecord | null>(null);
    const [yoloLoading, setYoloLoading] = useState(false);
    const [yoloError, setYoloError] = useState("");
    const [yoloFrameToken, setYoloFrameToken] = useState<number | null>(null);

    const [captureLoading, setCaptureLoading] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadCameraRecords() {
            const [health, history, latestAnalysis, latestYolo] = await Promise.allSettled([
                checkCameraRecordHealth(),
                getCameraRecordHistory(),
                getLatestAnalysisRecord(),
                getLatestYoloRecord(),
            ]);

            if (!active) return;

            if (health.status === "fulfilled") setCameraHealth(health.value);
            if (history.status === "fulfilled") {
                setCapturedImages(history.value.map(buildCapturedImageItem));
                if (history.value.length === 0) {
                    setCaptureStatus("Live feed connected. No saved camera records yet.");
                }
            }
            if (latestAnalysis.status === "fulfilled") setCameraAnalysis(latestAnalysis.value);
            if (latestYolo.status === "fulfilled") {
                setYoloResult(latestYolo.value);
                if (latestYolo.value?.yoloFrameUrl) setYoloFrameToken(Date.now());
            }
        }

        void loadCameraRecords();
        return () => { active = false; };
    }, []);

    async function handleAnalyseCamera() {
        setCameraMlLoading(true);
        setCameraMlError("");

        try {
            const analysis = await analyseCameraRecord();
            if (!analysis) throw new Error("No camera analysis record was returned.");
            setCameraAnalysis(analysis);
            setCapturedImages((prev) => [buildCapturedImageItem(analysis), ...prev]);
            setCaptureStatus(`Camera analysis saved at ${formatCurrentDateTime()}.`);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setCameraMlError(message);
        } finally {
            setCameraMlLoading(false);
        }
    }

    async function handleCaptureRequest() {
        setCaptureLoading(true);
        setCaptureStatus("Capturing...");

        try {
            const response = await captureCameraRecord();
            if (!response) throw new Error("No camera capture record was returned.");
            setCapturedImages((prev) => [buildCapturedImageItem(response), ...prev]);
            setCameraMlError("");
            setCaptureStatus("Capture record saved successfully.");
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setCaptureStatus(message);
        } finally {
            setCaptureLoading(false);
        }
    }

    async function handleYoloDetection() {
        setYoloLoading(true);
        setYoloError("");

        try {
            const result = await runYoloCameraRecord();
            if (!result) throw new Error("No YOLO detection record was returned.");
            setYoloResult(result);
            setCapturedImages((prev) => [buildCapturedImageItem(result), ...prev]);
            setYoloFrameToken(Date.now());
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setYoloError(message);
        } finally {
            setYoloLoading(false);
        }
    }

    const cameraMlServiceState = cameraMlError
        ? "Offline"
        : cameraAnalysis || cameraHealth
            ? "Online"
            : "Ready";

    const yoloDetections = parseDetections(yoloResult);
    const yoloFrameUrl = yoloResult?.yoloFrameUrl || getYoloFrameUrl();

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="tank-images-page page-container">
                        <div className="tank-images-topbar">
                            <div>
                                <h1 className="tank-images-page-title">Tank Images</h1>
                            </div>

                            <div className="tank-images-topbar-right">
                                <button className="tank-images-filter-btn" type="button">
                                    {formatCurrentDate()}
                                </button>

                                <button className="tank-images-filter-btn" type="button">
                                    {RAINWATER_TANK_NAME}
                                </button>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>
                        </div>

                        <div className="tank-images-main-grid">
                            <section className="tank-images-panel tank-live-panel">
                                <div className="tank-panel-header tank-panel-header-split">
                                    <h2>Live Feed</h2>
                                    <span className="tank-live-badge">Live</span>
                                </div>

                                <RpiCameraFeed
                                    frameClassName="tank-live-frame"
                                    imageClassName="tank-live-image"
                                    overlayLabel={RAINWATER_TANK_NAME}
                                    sourceLabel="Raspberry Pi camera ML latest frame"
                                    srcUrl={getLatestFrameUrl()}
                                    refreshMs={5000}
                                />

                                {yoloFrameToken !== null && (
                                    <div className="yolo-frame-section">
                                        <div className="tank-panel-header tank-panel-header-split" style={{ marginTop: "18px" }}>
                                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>YOLO Annotated Frame</h3>
                                            <span className={`yolo-status-pill ${getSeverityPillClass(yoloResult?.severity)}`}>
                                                {formatReadableStatus(yoloResult?.visualStatus ?? "detecting")}
                                            </span>
                                        </div>

                                        <div className="yolo-frame-preview">
                                            <img
                                                src={withImageCacheBust(yoloFrameUrl)}
                                                alt="YOLO annotated camera frame"
                                                className="tank-live-image"
                                                style={{ borderRadius: "14px", width: "100%" }}
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="tank-images-panel tank-control-panel">
                                <div className="tank-panel-header">
                                    <h2>Capture Control</h2>
                                    <p>Manual capture and image-quality analysis use the Spring Boot camera records API.</p>
                                </div>

                                <button
                                    className="tank-capture-btn secondary"
                                    type="button"
                                    onClick={handleAnalyseCamera}
                                    disabled={cameraMlLoading}
                                >
                                    {cameraMlLoading ? "Analysing..." : "Analyse Camera"}
                                </button>

                                <button
                                    className="tank-capture-btn secondary"
                                    type="button"
                                    onClick={handleYoloDetection}
                                    disabled={yoloLoading}
                                    style={{ marginTop: "8px" }}
                                >
                                    {yoloLoading ? "Detecting..." : "Run YOLO Detection"}
                                </button>

                                <button
                                    className="tank-capture-btn"
                                    type="button"
                                    onClick={handleCaptureRequest}
                                    disabled={captureLoading}
                                >
                                    {captureLoading ? "Capturing..." : "Capture Image"}
                                </button>

                                <div className="tank-camera-ml-card">
                                    <div className="tank-camera-ml-top">
                                        <div>
                                            <span>Camera ML Service</span>
                                            <strong>{cameraMlServiceState}</strong>
                                        </div>
                                        <span className={`tank-camera-ml-pill ${cameraAnalysis?.severity ?? (cameraMlError ? "offline" : "pending")}`}>
                                            {cameraAnalysis?.severity ?? (cameraMlError ? "offline" : "pending")}
                                        </span>
                                    </div>

                                    {cameraMlError ? (
                                        <p className="tank-camera-ml-error">{cameraMlError}</p>
                                    ) : (
                                        <div className="tank-camera-ml-grid">
                                            <div>
                                                <span>Status</span>
                                                <strong>{cameraAnalysis?.status ?? "--"}</strong>
                                            </div>
                                            <div>
                                                <span>Brightness</span>
                                                <strong>{formatMetric(cameraAnalysis?.brightness)}</strong>
                                            </div>
                                            <div>
                                                <span>Blur Score</span>
                                                <strong>{formatMetric(cameraAnalysis?.blurScore)}</strong>
                                            </div>
                                            <div>
                                                <span>Dark Ratio</span>
                                                <strong>{formatMetric(cameraAnalysis?.darkRatio)}</strong>
                                            </div>
                                            <div>
                                                <span>Bright Ratio</span>
                                                <strong>{formatMetric(cameraAnalysis?.brightRatio)}</strong>
                                            </div>
                                            <div>
                                                <span>Timestamp</span>
                                                <strong>{cameraAnalysis?.createdAt ?? "--"}</strong>
                                            </div>
                                        </div>
                                    )}

                                    <div className="tank-camera-ml-recommendation">
                                        <span>AI Recommendation</span>
                                        <p>
                                            {cameraAnalysis?.aiRecommendation
                                                ?? "Run Analyse Camera to load the latest saved Raspberry Pi camera ML result."}
                                        </p>
                                    </div>
                                </div>

                                <div className="tank-camera-ml-card yolo-result-card" style={{ marginTop: "12px" }}>
                                    <div className="tank-camera-ml-top">
                                        <div>
                                            <span>YOLO Detection</span>
                                            <strong>
                                                {yoloError
                                                    ? "Unavailable"
                                                    : yoloResult
                                                        ? "Completed"
                                                        : "Not run"}
                                            </strong>
                                        </div>
                                        <span className={`tank-camera-ml-pill ${getSeverityPillClass(yoloResult?.severity)}`}>
                                            {yoloResult?.severity ?? (yoloError ? "offline" : "pending")}
                                        </span>
                                    </div>

                                    {yoloError ? (
                                        <p className="tank-camera-ml-error yolo-offline-message">{yoloError}</p>
                                    ) : yoloResult ? (
                                        <>
                                            <div className="tank-camera-ml-grid">
                                                <div>
                                                    <span>Model</span>
                                                    <strong>{yoloResult.yoloModel ?? "--"}</strong>
                                                </div>
                                                <div>
                                                    <span>Visual Status</span>
                                                    <strong>{formatReadableStatus(yoloResult.visualStatus)}</strong>
                                                </div>
                                                <div>
                                                    <span>Detections</span>
                                                    <strong>{yoloResult.detectionCount ?? "--"}</strong>
                                                </div>
                                                <div>
                                                    <span>Timestamp</span>
                                                    <strong>{yoloResult.createdAt ?? "--"}</strong>
                                                </div>
                                            </div>

                                            {yoloDetections.length > 0 && (
                                                <div className="yolo-detection-list">
                                                    {yoloDetections.map((det, index) => (
                                                        <span key={index} className="yolo-detection-pill">
                                                            {formatReadableStatus(det.label ?? "object")} ({((det.confidence ?? 0) * 100).toFixed(0)}%)
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="tank-camera-ml-recommendation">
                                                <span>AI Recommendation</span>
                                                <p>{yoloResult.aiRecommendation}</p>
                                            </div>

                                            {yoloResult.futureNote && (
                                                <div className="yolo-result-meta">
                                                    <p>{yoloResult.futureNote}</p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="tank-camera-ml-recommendation">
                                            <p>Run YOLO Detection to save a detection record from the Raspberry Pi camera view.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="tank-control-divider" />

                                <div className="tank-toggle-row">
                                    <div>
                                        <h3>Auto Capture</h3>
                                        <p>Store images automatically after backend capture scheduling is enabled.</p>
                                    </div>

                                    <button
                                        type="button"
                                        className={`tank-toggle ${autoCapture ? "active" : ""}`}
                                        onClick={() => setAutoCapture((prev) => !prev)}
                                        aria-label="Toggle auto capture"
                                    >
                                        <span className="tank-toggle-knob" />
                                    </button>
                                </div>

                                <div className="tank-control-group">
                                    <label>Capture Interval</label>
                                    <select className="tank-images-select">
                                        <option>15 minutes</option>
                                        <option>30 minutes</option>
                                        <option>1 hour</option>
                                        <option>2 hours</option>
                                    </select>
                                </div>

                                <div className="tank-capture-status">
                                    {captureStatus}
                                </div>
                            </section>
                        </div>

                        <section className="tank-images-panel tank-gallery-panel">
                            <div className="tank-panel-header tank-gallery-header">
                                <div>
                                    <h2>Camera Records</h2>
                                    <p>
                                        {capturedImages.length > 0
                                            ? `${capturedImages.length} saved camera record${capturedImages.length !== 1 ? "s" : ""}.`
                                            : "Saved camera records will appear after capture, analysis, or YOLO detection."}
                                    </p>
                                </div>

                                <div className="tank-gallery-tools">
                                    <input
                                        type="text"
                                        placeholder="Search records..."
                                        className="tank-gallery-search"
                                    />
                                    <button className="tank-gallery-btn" type="button">
                                        Filter
                                    </button>
                                </div>
                            </div>

                            {capturedImages.length === 0 ? (
                                <div className="empty-state">
                                    <strong>No saved camera records yet.</strong>
                                    <span>
                                        Use Capture Image, Analyse Camera, or Run YOLO Detection to save real Raspberry Pi results.
                                    </span>
                                </div>
                            ) : (
                                <div className="tank-gallery-grid">
                                    {capturedImages.map((item) => (
                                        <article key={item.id} className="tank-gallery-card">
                                            <img
                                                src={item.imageUrl}
                                                alt={`${item.tank} camera record at ${item.timestamp}`}
                                                className="tank-gallery-image"
                                            />

                                            <div className="tank-gallery-card-body">
                                                <p className="tank-gallery-timestamp">{item.timestamp}</p>
                                                <h3 className="tank-gallery-filename" title={item.filepath}>
                                                    {item.filename}
                                                </h3>

                                                <div className="tank-gallery-status-row">
                                                    <span className="tank-gallery-status-pill">
                                                        {item.status ?? "saved"}
                                                    </span>
                                                    <span className={`tank-gallery-severity-pill ${getSeverityPillClass(item.severity)}`}>
                                                        {item.severity ?? "pending"}
                                                    </span>
                                                </div>

                                                {item.recommendation && (
                                                    <p className="tank-gallery-recommendation">
                                                        {item.recommendation}
                                                    </p>
                                                )}

                                                <div className="tank-gallery-footer">
                                                    <span className="tank-gallery-tag">{item.tank}</span>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
