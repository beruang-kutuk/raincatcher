import AppShell from "../../../components/layout/AppShell";
import cameraImg from "../../../assets/images/msu-camera.jpeg";

export default function LabDashboardPage() {
    return (
        <AppShell
            title="Organization overview"
            actions={
                <>
                    <button className="rc-btn">Filters</button>
                    <button className="rc-btn">Customize</button>
                    <button className="rc-btn">Export</button>
                </>
            }
        >
            <div className="rc-grid">
                {/* KPI Row spans first two columns */}
                <section className="rc-kpis">
                    <div className="rc-kpi">
                        <div className="rc-kpi-label">
                            Last telemetry <span className="rc-pill">Online</span>
                        </div>
                        <div className="rc-kpi-value">Today, 09:18</div>
                    </div>

                    <div className="rc-kpi">
                        <div className="rc-kpi-label">
                            Turbidity <span className="rc-pill">Normal</span>
                        </div>
                        <div className="rc-kpi-value">3.2 NTU</div>
                    </div>

                    <div className="rc-kpi">
                        <div className="rc-kpi-label">Cabinet temp</div>
                        <div className="rc-kpi-value">29.4°C</div>
                    </div>

                    <div className="rc-kpi">
                        <div className="rc-kpi-label">Cabinet humidity</div>
                        <div className="rc-kpi-value">68% RH</div>
                    </div>

                    <div className="rc-kpi">
                        <div className="rc-kpi-label">Storage estimate</div>
                        <div className="rc-kpi-value">62% (930L)</div>
                    </div>
                </section>

                {/* Center: Chart cards */}
                <section className="rc-card" style={{ gridColumn: "1 / span 1" }}>
                    <div className="rc-card-title">
                        <h3>Storage forecast (next 30 days)</h3>
                        <button className="rc-more">⋯</button>
                    </div>
                    <div className="rc-chart">Chart.js line chart (next step)</div>
                </section>

                <section className="rc-card" style={{ gridColumn: "2 / span 1" }}>
                    <div className="rc-card-title">
                        <h3>Rainfall trend (past 30 days)</h3>
                        <button className="rc-more">⋯</button>
                    </div>
                    <div className="rc-chart">Chart.js bar chart (next step)</div>
                </section>

                <section className="rc-card" style={{ gridColumn: "1 / span 2" }}>
                    <div className="rc-card-title">
                        <h3>Turbidity trend (past 30 days)</h3>
                        <button className="rc-more">⋯</button>
                    </div>
                    <div className="rc-chart">Chart.js line chart + threshold (next step)</div>
                </section>

                {/* Right column: camera + advisories */}
                <aside className="rc-right" style={{ gridColumn: "3 / span 1" }}>
                    <div className="rc-card">
                        <div className="rc-card-title">
                            <h3>Latest tank image</h3>
                            <button className="rc-more">⋯</button>
                        </div>
                        <img className="rc-camera-img" src={cameraImg} alt="Tank camera mock" />
                        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                            Last image: Today, 09:05
                        </div>
                    </div>

                    <div className="rc-card">
                        <div className="rc-card-title">
                            <h3>Advisories</h3>
                            <button className="rc-more">⋯</button>
                        </div>

                        <div className="rc-list">
                            <div className="rc-item">
                                <div className="rc-item-top">
                                    <div className="rc-item-title">High turbidity spike</div>
                                    <span className="rc-pill">Warning</span>
                                </div>
                                <div className="rc-item-meta">Turbidity exceeded threshold at 08:40</div>
                            </div>

                            <div className="rc-item">
                                <div className="rc-item-top">
                                    <div className="rc-item-title">Days-to-empty risk</div>
                                    <span className="rc-pill">Info</span>
                                </div>
                                <div className="rc-item-meta">Forecast may drop below 20% in 9 days</div>
                            </div>

                            <div className="rc-item">
                                <div className="rc-item-top">
                                    <div className="rc-item-title">Data completeness</div>
                                    <span className="rc-pill">92%</span>
                                </div>
                                <div className="rc-item-meta">Missing telemetry: 2 days in last 30 days</div>
                            </div>
                        </div>
                    </div>

                    <div className="rc-card">
                        <div className="rc-card-title">
                            <h3>Quick action</h3>
                            <button className="rc-more">⋯</button>
                        </div>
                        <button
                            className="rc-btn"
                            style={{
                                width: "100%",
                                height: 40,
                                borderRadius: 12,
                                border: "1px solid rgba(109,76,255,0.20)",
                                background: "rgba(109, 76, 255, 0.10)",
                                color: "rgba(109, 76, 255, 0.95)",
                                fontWeight: 900,
                            }}
                        >
                            Add manual tank reading (mock)
                        </button>
                    </div>
                </aside>
            </div>
        </AppShell>
    );
}
