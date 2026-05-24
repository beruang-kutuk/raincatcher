import { useMemo, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/simulation.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import { formatDateRange, getProjectionDays } from "../../../services/time";

type SummaryCard = {
    label: string;
    value: string;
    subtext: string;
    status: "good" | "low" | "warning";
};

type ProjectionPoint = {
    label: string;
    day: string;
    value: number;
};

type ScenarioRow = {
    id: number;
    name: string;
    description: string;
    finalLevel: string;
    lowestLevel: string;
    overflowRisk: string;
    shortageRisk: string;
    rainfallChange: string;
    usageChange: string;
    efficiency: string;
    recommendation: string;
    tag?: string;
};

function buildProjection(startingLevel: number, efficiency: number, days: number): ProjectionPoint[] {
    const efficiencyLift = (efficiency - 80) * 0.08;

    return getProjectionDays(days).map((item, index) => {
        const drift = index * 1.8;
        const value = Math.max(0, Math.min(100, Math.round(startingLevel + efficiencyLift - drift)));

        return {
            label: item.date,
            day: item.day,
            value,
        };
    });
}

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

function StorageProjectionChart({ data }: { data: ProjectionPoint[] }) {
    const width = 760;
    const height = 280;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 42;

    const min = 0;
    const max = 100;

    const points = data.map((item, index) => {
        const x =
            paddingLeft +
            (index * (width - paddingLeft - paddingRight)) / Math.max(data.length - 1, 1);
        const y =
            height -
            paddingBottom -
            ((item.value - min) / (max - min)) * (height - paddingTop - paddingBottom);

        return { x, y };
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
                {data.map((item) => (
                    <span key={item.label}>{item.label}</span>
                ))}
            </div>
        </div>
    );
}

function StorageProjectionTable({ data }: { data: ProjectionPoint[] }) {
    return (
        <div className="simulation-table-wrap">
            <table className="simulation-table">
                <thead>
                    <tr>
                        <th>Day</th>
                        <th>Date</th>
                        <th>Projected Storage</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr key={item.label}>
                            <td>{item.day}</td>
                            <td>{item.label}</td>
                            <td>{item.value}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function SimulationPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [startingLevel, setStartingLevel] = useState(78);
    const [efficiency, setEfficiency] = useState(88);
    const [forecastPeriod, setForecastPeriod] = useState(7);
    const [expectedRainfall, setExpectedRainfall] = useState("0");
    const [dailyUsage, setDailyUsage] = useState("0");
    const [tankCapacity, setTankCapacity] = useState("100");
    const [projectionView, setProjectionView] = useState<"chart" | "table">("chart");
    const [weekModalOpen, setWeekModalOpen] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState(formatDateRange(7));
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    const [scenarioRows, setScenarioRows] = useState<ScenarioRow[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<ScenarioRow | null>(null);
    const [addScenarioOpen, setAddScenarioOpen] = useState(false);

    const [newScenario, setNewScenario] = useState({
        name: "",
        rainfallChange: "0",
        usageChange: "0",
        startingLevel: "78",
        efficiency: "88",
        forecastPeriod: "7 Days",
    });

    const projectionData = useMemo(
        () => buildProjection(startingLevel, efficiency, forecastPeriod),
        [startingLevel, efficiency, forecastPeriod],
    );

    const finalLevel = projectionData.at(-1)?.value ?? startingLevel;
    const lowestLevel = Math.min(...projectionData.map((item) => item.value));
    const overflowRisk = finalLevel > 92 ? "Medium" : "Low";
    const shortageRisk = lowestLevel < 30 ? "High" : lowestLevel < 45 ? "Medium" : "Low";

    const summaryCards: SummaryCard[] = [
        { label: "Final Storage Level", value: `${finalLevel}%`, subtext: `${finalLevel} m3 of ${tankCapacity} m3`, status: finalLevel > 45 ? "good" : "warning" },
        { label: "Lowest Level Reached", value: `${lowestLevel}%`, subtext: `${lowestLevel} m3 estimated`, status: lowestLevel > 45 ? "good" : "warning" },
        { label: "Overflow Risk", value: overflowRisk, subtext: "Derived from projected final level", status: overflowRisk === "Low" ? "low" : "warning" },
        { label: "Shortage Risk", value: shortageRisk, subtext: "Derived from projected minimum level", status: shortageRisk === "Low" ? "low" : "warning" },
    ];

    const weekOptions = [
        formatDateRange(7),
        formatDateRange(7, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        formatDateRange(7, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        formatDateRange(7, new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
    ];

    function applyCustomRange() {
        if (customStartDate && customEndDate) {
            setSelectedWeek(`${customStartDate} - ${customEndDate}`);
        } else {
            setSelectedWeek("Custom week range");
        }

        setWeekModalOpen(false);
    }

    function deleteScenario(id: number) {
        setScenarioRows((prev) => prev.filter((scenario) => scenario.id !== id));
    }

    function createScenario() {
        const rainfall = Number(newScenario.rainfallChange);
        const usage = Number(newScenario.usageChange);
        const start = Number(newScenario.startingLevel);
        const eff = Number(newScenario.efficiency);

        const scenarioProjection = buildProjection(start + rainfall * 0.18 - usage * 0.22, eff, Number.parseInt(newScenario.forecastPeriod) || 7);
        const scenarioFinal = scenarioProjection.at(-1)?.value ?? start;
        const scenarioLow = Math.min(...scenarioProjection.map((item) => item.value));
        const overflow = Math.max(2, Math.min(90, Math.round(scenarioFinal > 90 ? 45 + rainfall * 0.2 : 8 + rainfall * 0.1)));
        const shortage = Math.max(2, Math.min(90, Math.round(scenarioLow < 35 ? 55 + usage * 0.2 : 10 + usage * 0.1)));

        const scenarioName = newScenario.name.trim() || "Custom Scenario";

        const createdScenario: ScenarioRow = {
            id: Date.now(),
            name: scenarioName,
            description: `Rainfall ${rainfall >= 0 ? "+" : ""}${rainfall}%, usage ${usage >= 0 ? "+" : ""}${usage}%`,
            finalLevel: `${scenarioFinal}%`,
            lowestLevel: `${scenarioLow}%`,
            overflowRisk: `${overflow > 40 ? "High" : overflow > 20 ? "Medium" : "Low"} (${overflow}%)`,
            shortageRisk: `${shortage > 40 ? "High" : shortage > 20 ? "Medium" : "Low"} (${shortage}%)`,
            rainfallChange: `${rainfall >= 0 ? "+" : ""}${rainfall}%`,
            usageChange: `${usage >= 0 ? "+" : ""}${usage}%`,
            efficiency: `${eff}%`,
            recommendation:
                shortage > 40
                    ? "Shortage risk is high. Reduce usage or prepare alternative water supply."
                    : overflow > 40
                        ? "Overflow risk is high. Monitor storage level and prepare drainage."
                        : "Scenario remains within acceptable operating range.",
        };

        setScenarioRows((prev) => [...prev, createdScenario]);
        setAddScenarioOpen(false);
        setNewScenario({
            name: "",
            rainfallChange: "0",
            usageChange: "0",
            startingLevel: "78",
            efficiency: "88",
            forecastPeriod: "7 Days",
        });
    }

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
                                <button
                                    className="simulation-filter-btn simulation-week-btn"
                                    type="button"
                                    onClick={() => setWeekModalOpen(true)}
                                >
                                    {selectedWeek}
                                    <span>v</span>
                                </button>

                                <button className="simulation-filter-btn" type="button">
                                    {RAINWATER_TANK_NAME}
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
                                    <p>Adjust values and run a frontend what-if projection.</p>
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
                                    <select
                                        className="simulation-select"
                                        value={forecastPeriod}
                                        onChange={(event) => setForecastPeriod(Number(event.target.value))}
                                    >
                                        <option value={7}>7 Days</option>
                                        <option value={14}>14 Days</option>
                                        <option value={30}>30 Days</option>
                                    </select>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Expected Rainfall (Total)</label>
                                    <div className="simulation-input-with-unit">
                                        <input
                                            type="number"
                                            value={expectedRainfall}
                                            onChange={(event) => setExpectedRainfall(event.target.value)}
                                            className="simulation-input"
                                        />
                                        <span>mm</span>
                                    </div>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Average Daily Usage</label>
                                    <div className="simulation-input-with-unit">
                                        <input
                                            type="number"
                                            value={dailyUsage}
                                            onChange={(event) => setDailyUsage(event.target.value)}
                                            className="simulation-input"
                                        />
                                        <span>m3/day</span>
                                    </div>
                                </div>

                                <div className="simulation-input-group">
                                    <label>Tank Capacity</label>
                                    <div className="simulation-input-with-unit">
                                        <input
                                            type="number"
                                            value={tankCapacity}
                                            onChange={(event) => setTankCapacity(event.target.value)}
                                            className="simulation-input"
                                        />
                                        <span>m3</span>
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
                                            <button
                                                className={`simulation-toggle-btn ${projectionView === "chart" ? "active" : ""}`}
                                                type="button"
                                                onClick={() => setProjectionView("chart")}
                                            >
                                                Chart
                                            </button>
                                            <button
                                                className={`simulation-toggle-btn ${projectionView === "table" ? "active" : ""}`}
                                                type="button"
                                                onClick={() => setProjectionView("table")}
                                            >
                                                Table
                                            </button>
                                        </div>
                                    </div>

                                    {projectionView === "chart" ? (
                                        <StorageProjectionChart data={projectionData} />
                                    ) : (
                                        <StorageProjectionTable data={projectionData} />
                                    )}

                                    <div className="simulation-chart-legend">
                                        <span><i className="legend-simulated" /> Simulated</span>
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
                                    <p>Compare scenarios for {RAINWATER_TANK_NAME}.</p>
                                </div>

                                <button
                                    className="simulation-add-btn"
                                    type="button"
                                    onClick={() => setAddScenarioOpen(true)}
                                >
                                    + Add Scenario
                                </button>
                            </div>

                            {scenarioRows.length === 0 ? (
                                <div className="empty-state">
                                    <strong>No saved scenarios yet</strong>
                                    <span>Add a scenario to compare rainfall, usage, starting level, and efficiency assumptions.</span>
                                </div>
                            ) : (
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
                                                            <button
                                                                type="button"
                                                                className="simulation-icon-btn"
                                                                title="View simulation result"
                                                                onClick={() => setSelectedScenario(row)}
                                                            >
                                                                <ExternalLink size={16} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="simulation-icon-btn simulation-delete-btn"
                                                                title="Delete scenario"
                                                                onClick={() => deleteScenario(row.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>

            {weekModalOpen && (
                <div className="simulation-week-modal-backdrop">
                    <div className="simulation-week-modal">
                        <div className="simulation-week-modal-header">
                            <div>
                                <h2>Select Simulation Week</h2>
                                <p>Choose the forecast range for this simulation.</p>
                            </div>

                            <button
                                type="button"
                                className="simulation-week-modal-close"
                                onClick={() => setWeekModalOpen(false)}
                            >
                                x
                            </button>
                        </div>

                        <div className="simulation-week-options">
                            {weekOptions.map((week) => (
                                <button
                                    key={week}
                                    type="button"
                                    className={`simulation-week-option ${selectedWeek === week ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedWeek(week);
                                        setWeekModalOpen(false);
                                    }}
                                >
                                    <strong>{week}</strong>
                                    <span>7-day simulation range</span>
                                </button>
                            ))}
                        </div>

                        <div className="simulation-custom-range">
                            <label>Custom Range</label>

                            <div className="simulation-custom-range-inputs">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                />
                            </div>

                            <button
                                type="button"
                                className="simulation-apply-week-btn"
                                onClick={applyCustomRange}
                            >
                                Apply Range
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedScenario && (
                <div className="simulation-modal-backdrop">
                    <div className="simulation-result-modal">
                        <div className="simulation-modal-header">
                            <div>
                                <h2>{selectedScenario.name}</h2>
                                <p>Simulation result details for {RAINWATER_TANK_NAME}.</p>
                            </div>

                            <button
                                type="button"
                                className="simulation-modal-close"
                                onClick={() => setSelectedScenario(null)}
                            >
                                x
                            </button>
                        </div>

                        <div className="simulation-result-grid">
                            <div className="simulation-result-card">
                                <span>Final Storage Level</span>
                                <strong>{selectedScenario.finalLevel}</strong>
                            </div>

                            <div className="simulation-result-card">
                                <span>Lowest Level</span>
                                <strong>{selectedScenario.lowestLevel}</strong>
                            </div>

                            <div className="simulation-result-card">
                                <span>Overflow Risk</span>
                                <strong>{selectedScenario.overflowRisk}</strong>
                            </div>

                            <div className="simulation-result-card">
                                <span>Shortage Risk</span>
                                <strong>{selectedScenario.shortageRisk}</strong>
                            </div>
                        </div>

                        <div className="simulation-result-details">
                            <h3>Scenario Parameters</h3>

                            <div className="simulation-result-detail-row">
                                <span>Description</span>
                                <strong>{selectedScenario.description}</strong>
                            </div>

                            <div className="simulation-result-detail-row">
                                <span>Rainfall Change</span>
                                <strong>{selectedScenario.rainfallChange}</strong>
                            </div>

                            <div className="simulation-result-detail-row">
                                <span>Usage Change</span>
                                <strong>{selectedScenario.usageChange}</strong>
                            </div>

                            <div className="simulation-result-detail-row">
                                <span>Collection Efficiency</span>
                                <strong>{selectedScenario.efficiency}</strong>
                            </div>
                        </div>

                        <div className="simulation-recommendation-box">
                            <h3>Recommendation</h3>
                            <p>{selectedScenario.recommendation}</p>
                        </div>

                        <button
                            type="button"
                            className="simulation-run-btn"
                            onClick={() => setSelectedScenario(null)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {addScenarioOpen && (
                <div className="simulation-modal-backdrop">
                    <div className="simulation-result-modal">
                        <div className="simulation-modal-header">
                            <div>
                                <h2>Add Scenario</h2>
                                <p>Input simulation parameters for {RAINWATER_TANK_NAME}.</p>
                            </div>

                            <button
                                type="button"
                                className="simulation-modal-close"
                                onClick={() => setAddScenarioOpen(false)}
                            >
                                x
                            </button>
                        </div>

                        <div className="simulation-form-grid">
                            <div className="simulation-input-group">
                                <label>Scenario Name</label>
                                <input
                                    className="simulation-input"
                                    value={newScenario.name}
                                    onChange={(e) => setNewScenario((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Extreme Rainfall"
                                />
                            </div>

                            <div className="simulation-input-group">
                                <label>Forecast Period</label>
                                <select
                                    className="simulation-select"
                                    value={newScenario.forecastPeriod}
                                    onChange={(e) => setNewScenario((prev) => ({ ...prev, forecastPeriod: e.target.value }))}
                                >
                                    <option>7 Days</option>
                                    <option>14 Days</option>
                                    <option>30 Days</option>
                                </select>
                            </div>

                            <div className="simulation-input-group">
                                <label>Rainfall Change</label>
                                <div className="simulation-input-with-unit">
                                    <input
                                        className="simulation-input"
                                        type="number"
                                        value={newScenario.rainfallChange}
                                        onChange={(e) => setNewScenario((prev) => ({ ...prev, rainfallChange: e.target.value }))}
                                    />
                                    <span>%</span>
                                </div>
                            </div>

                            <div className="simulation-input-group">
                                <label>Usage Change</label>
                                <div className="simulation-input-with-unit">
                                    <input
                                        className="simulation-input"
                                        type="number"
                                        value={newScenario.usageChange}
                                        onChange={(e) => setNewScenario((prev) => ({ ...prev, usageChange: e.target.value }))}
                                    />
                                    <span>%</span>
                                </div>
                            </div>

                            <div className="simulation-input-group">
                                <label>Starting Level</label>
                                <div className="simulation-input-with-unit">
                                    <input
                                        className="simulation-input"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newScenario.startingLevel}
                                        onChange={(e) => setNewScenario((prev) => ({ ...prev, startingLevel: e.target.value }))}
                                    />
                                    <span>%</span>
                                </div>
                            </div>

                            <div className="simulation-input-group">
                                <label>Collection Efficiency</label>
                                <div className="simulation-input-with-unit">
                                    <input
                                        className="simulation-input"
                                        type="number"
                                        min="50"
                                        max="100"
                                        value={newScenario.efficiency}
                                        onChange={(e) => setNewScenario((prev) => ({ ...prev, efficiency: e.target.value }))}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="simulation-run-btn"
                            onClick={createScenario}
                        >
                            Create Scenario
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

