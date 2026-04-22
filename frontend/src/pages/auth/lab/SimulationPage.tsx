import { useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/simulation.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type SummaryCard = {
    label: string;
    value: string;
    subtext: string;
    status: "good" | "low" | "warning";
};

type ScenarioRow = {
    id: number;
    name: string;
    description: string;
    finalLevel: string;
    lowestLevel: string;
    overflowRisk: string;
    shortageRisk: string;
    tag?: string;
};

const summaryCards: SummaryCard[] = [
    {
        label: "Final Storage Level",
        value: "82%",
        subtext: "≈ 82 m³",
        status: "good",
    },
    {
        label: "Lowest Level Reached",
        value: "62%",
        subtext: "≈ 62 m³",
        status: "good",
    },
    {
        label: "Overflow Risk",
        value: "Low",
        subtext: "12% chance",
        status: "warning",
    },
    {
        label: "Shortage Risk",
        value: "Low",
        subtext: "8% chance",
        status: "low",
    },
];

const scenarioRows: ScenarioRow[] = [
    {
        id: 1,
        name: "Current Simulation",
        description: "Moderate rainfall, normal usage",
        finalLevel: "82%",
        lowestLevel: "62%",
        overflowRisk: "Low (12%)",
        shortageRisk: "Low (8%)",
        tag: "Active",
    },
    {
        id: 2,
        name: "High Rainfall",
        description: "Heavy rainfall (+60%)",
        finalLevel: "96%",
        lowestLevel: "78%",
        overflowRisk: "Medium (35%)",
        shortageRisk: "Very Low (2%)",
    },
    {
        id: 3,
        name: "High Usage",
        description: "Usage +30%",
        finalLevel: "55%",
        lowestLevel: "38%",
        overflowRisk: "Low (5%)",
        shortageRisk: "High (42%)",
    },
    {
        id: 4,
        name: "Dry Weather",
        description: "Low rainfall (-50%)",
        finalLevel: "41%",
        lowestLevel: "24%",
        overflowRisk: "Low (3%)",
        shortageRisk: "High (68%)",
    },
];

function getSummaryStatusClass(status: "good" | "low" | "warning") {
    if (status === "warning") return "simulation-status-warning";
    if (status === "low") return "simulation-status-low";
    return "simulation-status-good";
}

function SummaryMetricCard({ label, value, subtext, status }: SummaryCard) {
    return (
        <div className="simulation-summary-card">
            <p className="simulation-summary-label">{label}</p>
            <h3 className="simulation-summary-value">{value}</h3>

            <div className="simulation-summary-status">
                <span className={`status-pill ${getSummaryStatusClass(status)}`}>
                    {status}
                </span>
            </div>

            <p className="simulation-summary-subtext">{subtext}</p>
        </div>
    );
}

function StorageProjectionChart() {
    const values = [78, 83, 83, 88, 84, 76, 66, 61];
    const labels = ["21 Apr", "22 Apr", "23 Apr", "24 Apr", "25 Apr", "26 Apr", "27 Apr", "28 Apr"];

    const width = 760;
    const height = 280;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 42;

    const min = 0;
    const max = 100;

    const points = values.map((value, index) => {
        const x =
            paddingLeft +
            (index * (width - paddingLeft - paddingRight)) / (values.length - 1);
        const y =
            height -
            paddingBottom -
            ((value - min) / (max - min)) * (height - paddingTop - paddingBottom);

        return { x, y, value };
    });

    const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    return (
        <div className="simulation-chart-shell">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="simulation-chart-svg"
                preserveAspectRatio="none"
            >
                {[0, 20, 40, 60, 80, 100].map((tick) => {
                    const y =
                        height -
                        paddingBottom -
                        ((tick - min) / (max - min)) * (height - paddingTop - paddingBottom);

                    return (
                        <g key={tick}>
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={width - paddingRight}
                                y2={y}
                                className="simulation-grid-line"
                            />
                            <text x={6} y={y + 4} className="simulation-axis-text">
                                {tick}%
                            </text>
                        </g>
                    );
                })}

                <rect
                    x={paddingLeft}
                    y={paddingTop + 28}
                    width={width - paddingLeft - paddingRight}
                    height={height - paddingTop - paddingBottom - 48}
                    className="simulation-safe-zone"
                />

                <line
                    x1={paddingLeft}
                    y1={height - paddingBottom - ((30 - min) / (max - min)) * (height - paddingTop - paddingBottom)}
                    x2={width - paddingRight}
                    y2={height - paddingBottom - ((30 - min) / (max - min)) * (height - paddingTop - paddingBottom)}
                    className="simulation-critical-line"
                />

                <polyline points={linePoints} className="simulation-line" />

                {points.map((p, index) => (
                    <circle
                        key={index}
                        cx={p.x}
                        cy={p.y}
                        r="4.5"
                        className="simulation-point"
                    />
                ))}
            </svg>

            <div className="simulation-chart-labels">
                {labels.map((label) => (
                    <span key={label}>{label}</span>
                ))}
            </div>
        </div>
    );
}

export default function SimulationPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [startingLevel, setStartingLevel] = useState(78);
    const [efficiency, setEfficiency] = useState(88);

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="simulation-page page-container">
                        <div className="simulation-topbar">
                            <div>
                                <h1 className="simulation-page-title">Simulation</h1>
                            </div>

                            <div className="simulation-topbar-right">
                                <button className="simulation-filter-btn" type="button">
                                    21 Apr 2026 - 28 Apr 2026
                                </button>

                                <button className="simulation-filter-btn" type="button">
                                    Tank A
                                </button>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>
                        </div>

                        <div className="simulation-main-grid">
                            <section className="simulation-panel simulation-input-panel">
                                <div className="simulation-panel-header">
                                    <h2>Input Parameters</h2>
                                    <p>Adjust the values and run simulation.</p>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Starting Tank Level</label>
                                    <div className="simulation-range-row">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={startingLevel}
                                            onChange={(e) => setStartingLevel(Number(e.target.value))}
                                            className="simulation-range"
                                        />
                                        <span className="simulation-range-value">{startingLevel}%</span>
                                    </div>
                                    <div className="simulation-range-scale">
                                        <span>0%</span>
                                        <span>100%</span>
                                    </div>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Forecast Period</label>
                                    <select className="simulation-select">
                                        <option>7 Days</option>
                                        <option>14 Days</option>
                                        <option>30 Days</option>
                                    </select>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Expected Rainfall (Total)</label>
                                    <div className="simulation-input-with-unit">
                                        <input type="text" value="45" readOnly className="simulation-input" />
                                        <span>mm</span>
                                    </div>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Average Daily Usage</label>
                                    <div className="simulation-input-with-unit">
                                        <input type="text" value="8.5" readOnly className="simulation-input" />
                                        <span>m³/day</span>
                                    </div>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Tank Capacity</label>
                                    <div className="simulation-input-with-unit">
                                        <input type="text" value="100" readOnly className="simulation-input" />
                                        <span>m³</span>
                                    </div>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Collection Efficiency</label>
                                    <div className="simulation-range-row">
                                        <input
                                            type="range"
                                            min="50"
                                            max="100"
                                            value={efficiency}
                                            onChange={(e) => setEfficiency(Number(e.target.value))}
                                            className="simulation-range"
                                        />
                                        <span className="simulation-range-value">{efficiency}%</span>
                                    </div>
                                    <div className="simulation-range-scale">
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                </div>

                                <button className="simulation-run-btn" type="button">
                                    Run Simulation
                                </button>
                            </section>

                            <div className="simulation-right-column">
                                <div className="simulation-summary-grid">
                                    {summaryCards.map((item) => (
                                        <SummaryMetricCard key={item.label} {...item} />
                                    ))}
                                </div>

                                <section className="simulation-panel simulation-chart-panel">
                                    <div className="simulation-panel-header simulation-panel-header-split">
                                        <h2>Storage Projection</h2>

                                        <div className="simulation-chart-toggle">
                                            <button className="simulation-toggle-btn active" type="button">
                                                Chart
                                            </button>
                                            <button className="simulation-toggle-btn" type="button">
                                                Table
                                            </button>
                                        </div>
                                    </div>

                                    <StorageProjectionChart />

                                    <div className="simulation-chart-legend">
                                        <span><i className="legend-simulated" /> Simulated</span>
                                        <span><i className="legend-baseline" /> Baseline (Normal)</span>
                                        <span><i className="legend-safe" /> Safe Range</span>
                                        <span><i className="legend-critical" /> Critical Level (30%)</span>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <section className="simulation-panel simulation-table-panel">
                            <div className="simulation-panel-header simulation-panel-header-split">
                                <div>
                                    <h2>Scenario Comparison</h2>
                                    <p>Compare different scenarios side by side.</p>
                                </div>

                                <button className="simulation-add-btn" type="button">
                                    + Add Scenario
                                </button>
                            </div>

                            <div className="simulation-table-wrap">
                                <table className="simulation-table">
                                    <thead>
                                        <tr>
                                            <th>Scenario</th>
                                            <th>Description</th>
                                            <th>Final Level</th>
                                            <th>Lowest Level</th>
                                            <th>Overflow Risk</th>
                                            <th>Shortage Risk</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scenarioRows.map((row) => (
                                            <tr key={row.id}>
                                                <td>
                                                    <div className="simulation-scenario-cell">
                                                        <span className="simulation-dot" />
                                                        <span>{row.name}</span>
                                                        {row.tag && (
                                                            <span className="simulation-row-tag">{row.tag}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{row.description}</td>
                                                <td>{row.finalLevel}</td>
                                                <td>{row.lowestLevel}</td>
                                                <td>{row.overflowRisk}</td>
                                                <td>{row.shortageRisk}</td>
                                                <td>
                                                    <div className="simulation-actions">
                                                        <button type="button" className="simulation-icon-btn">↗</button>
                                                        <button type="button" className="simulation-icon-btn">•••</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}