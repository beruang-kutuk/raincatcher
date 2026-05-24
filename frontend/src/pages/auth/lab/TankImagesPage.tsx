import { useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/tank-images.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import RpiCameraFeed from "../../../components/lab/RpiCameraFeed";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import { formatCurrentDate, formatCurrentDateTime } from "../../../services/time";

type CaptureItem = {
    id: number;
    imageUrl: string;
    timestamp: string;
    tank: typeof RAINWATER_TANK_NAME;
};

const capturedImages: CaptureItem[] = [];

export default function TankImagesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [autoCapture, setAutoCapture] = useState(false);
    const [captureStatus, setCaptureStatus] = useState(
        "Capture endpoint not connected. Raspberry Pi images will appear after capture is enabled.",
    );

    function handleCaptureRequest() {
        setCaptureStatus(`Capture request prepared at ${formatCurrentDateTime()}. Backend camera capture endpoint is pending.`);
    }

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
                                />
                            </section>

                            <section className="tank-images-panel tank-control-panel">
                                <div className="tank-panel-header">
                                    <h2>Capture Control</h2>
                                    <p>Manual capture is prepared for the Raspberry Pi camera endpoint.</p>
                                </div>

                                <button
                                    className="tank-capture-btn"
                                    type="button"
                                    onClick={handleCaptureRequest}
                                >
                                    Capture Image
                                </button>

                                <div className="tank-control-divider" />

                                <div className="tank-toggle-row">
                                    <div>
                                        <h3>Auto Capture</h3>
                                        <p>Store images automatically after backend capture is enabled.</p>
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
                                    <h2>Captured Images</h2>
                                    <p>Images will be listed after Raspberry Pi capture storage is connected.</p>
                                </div>

                                <div className="tank-gallery-tools">
                                    <input
                                        type="text"
                                        placeholder="Search images..."
                                        className="tank-gallery-search"
                                    />
                                    <button className="tank-gallery-btn" type="button">
                                        Filter
                                    </button>
                                </div>
                            </div>

                            {capturedImages.length === 0 ? (
                                <div className="empty-state">
                                    <strong>No captured images yet.</strong>
                                    <span>
                                        Images will appear here after camera capture is enabled.
                                    </span>
                                </div>
                            ) : (
                                <div className="tank-gallery-grid">
                                    {capturedImages.map((item) => (
                                        <article key={item.id} className="tank-gallery-card">
                                            <img
                                                src={item.imageUrl}
                                                alt={`${item.tank} capture at ${item.timestamp}`}
                                                className="tank-gallery-image"
                                            />

                                            <div className="tank-gallery-card-body">
                                                <p className="tank-gallery-timestamp">{item.timestamp}</p>

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

