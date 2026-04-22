import { useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/tank-images.css";
import Sidebar from "../../../components/layout/Sidebar";
import tankImage from "../../../assets/images/msu-camera.jpeg";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type CaptureItem = {
    id: number;
    image: string;
    timestamp: string;
    tank: string;
};

const capturedImages: CaptureItem[] = [
    {
        id: 1,
        image: tankImage,
        timestamp: "21 Apr 2026, 10:15 AM",
        tank: "Tank A",
    },
    {
        id: 2,
        image: tankImage,
        timestamp: "21 Apr 2026, 10:00 AM",
        tank: "Tank A",
    },
    {
        id: 3,
        image: tankImage,
        timestamp: "21 Apr 2026, 09:45 AM",
        tank: "Tank A",
    },
    {
        id: 4,
        image: tankImage,
        timestamp: "21 Apr 2026, 09:30 AM",
        tank: "Tank A",
    },
    {
        id: 5,
        image: tankImage,
        timestamp: "21 Apr 2026, 09:15 AM",
        tank: "Tank A",
    },
];

export default function TankImagesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [autoCapture, setAutoCapture] = useState(true);

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
                                    21 Apr 2026
                                </button>

                                <button className="tank-images-filter-btn" type="button">
                                    All Tanks
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
                                    <span className="tank-live-badge">● Live</span>
                                </div>

                                <div className="tank-live-frame">
                                    <img
                                        src={tankImage}
                                        alt="Live tank feed"
                                        className="tank-live-image"
                                    />

                                    <div className="tank-live-overlay">Tank A</div>
                                </div>

                                <div className="tank-live-meta-grid">
                                    <div className="tank-live-meta-item">
                                        <span className="tank-live-meta-label">Resolution</span>
                                        <strong>1080p</strong>
                                    </div>

                                    <div className="tank-live-meta-item">
                                        <span className="tank-live-meta-label">FPS</span>
                                        <strong>30</strong>
                                    </div>

                                    <div className="tank-live-meta-item">
                                        <span className="tank-live-meta-label">Last Updated</span>
                                        <strong>10:24:15 AM</strong>
                                    </div>

                                    <div className="tank-live-meta-item">
                                        <span className="tank-live-meta-label">Connection</span>
                                        <strong>Good</strong>
                                    </div>
                                </div>
                            </section>

                            <section className="tank-images-panel tank-control-panel">
                                <div className="tank-panel-header">
                                    <h2>Capture Control</h2>
                                    <p>Manually capture a new image from the live feed.</p>
                                </div>

                                <div className="tank-control-group">
                                    <label>Select Tank</label>
                                    <select className="tank-images-select">
                                        <option>Tank A</option>
                                        <option>Tank B</option>
                                        <option>Tank C</option>
                                        <option>Tank D</option>
                                    </select>
                                </div>

                                <button className="tank-capture-btn" type="button">
                                    Capture Image
                                </button>

                                <div className="tank-control-divider" />

                                <div className="tank-toggle-row">
                                    <div>
                                        <h3>Auto Capture</h3>
                                        <p>Capture images automatically at a set interval.</p>
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
                            </section>
                        </div>

                        <section className="tank-images-panel tank-gallery-panel">
                            <div className="tank-panel-header tank-gallery-header">
                                <div>
                                    <h2>Captured Images</h2>
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

                            <div className="tank-gallery-grid">
                                {capturedImages.map((item) => (
                                    <article key={item.id} className="tank-gallery-card">
                                        <img
                                            src={item.image}
                                            alt={item.timestamp}
                                            className="tank-gallery-image"
                                        />

                                        <div className="tank-gallery-card-body">
                                            <p className="tank-gallery-timestamp">{item.timestamp}</p>

                                            <div className="tank-gallery-footer">
                                                <span className="tank-gallery-tag">{item.tank}</span>
                                                <button type="button" className="tank-gallery-more">
                                                    •••
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}