import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/simulation.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import { getWhatIfScenario, type WhatIfScenarioResponse } from "../../../services/forecastApi";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import { formatDateRange, getProjectionDays } from "../../../services/time";
import {
    getSimulationScenarios,
    saveSimulationScenario,
    deleteSimulationScenario,
    type SimulationScenarioRecord,
} from "../../../services/simulationApi";

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
    forecastPeriod: string;
    recommendation: string;
    tag?: string;
};

const DEFAULT_CATCHMENT_AREA_M2 = 75;

function buildProjection(startingLevel: number, efficiency: number, days: number): ProjectionPoint[] {
    const efficiencyLift = (efficiency - 80) * 0.08;
    return getProjectionDays(days).map((item, index) => {
        const drift = index * 1.8;
        const value = Math.max(0, Math.min(100, Math.round(startingLevel + efficiencyLift - drift)));
        return { label: item.date, day: item.day, value };
    });
}

function buildPhysicsProjection(
    startingLevelPercent: number,
    rainfallTotalMm: number,
    dailyUsageM3: number,
    capacityM3: number,
    efficiencyPercent: number,
    days: number,
): ProjectionPoint[] {
    const efficiencyRatio = efficiencyPercent / 100;
    const harvestM3 = rainfallTotalMm * DEFAULT_CATCHMENT_AREA_M2 * efficiencyRatio / 1000;
    let storageM3 = (startingLevelPercent / 100) * capacityM3;
    return getProjectionDays(days).map((item, index) => {
        const dayHarvest = index === 0 ? harvestM3 : 0;
        storageM3 = Math.max(0, Math.min(capacityM3, storageM3 + dayHarvest - dailyUsageM3));
        const levelPercent = capacityM3 > 0 ? Math.round((storageM3 / capacityM3) * 100) : 0;
        return { label: item.date, day: item.day, value: levelPercent };
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

function backendToRow(r: SimulationScenarioRecord): ScenarioRow {
    const final = r.finalLevelPercent ?? 0;
    const low = r.lowestLevelPercent ?? 0;
    return {
        id: r.id,
        name: r.scenarioName,
        description: `Start ${r.startingLevelPercent ?? "--"}% · Rain ${r.rainfallMm ?? 0}mm · Usage ${r.dailyUsageM3 ?? 0}m³/day`,
        finalLevel: `${final.toFixed(1)}%`,
        lowestLevel: `${low.toFixed(1)}%`,
        overflowRisk: r.overflowRisk,
        shortageRisk: r.shortageRisk,
        rainfallChange: `${r.rainfallMm ?? 0} mm`,
        usageChange: `${r.dailyUsageM3 ?? 0} m³/day`,
        efficiency: `${r.collectionEfficiencyPercent ?? "--"}%`,
        forecastPeriod: "--",
        recommendation: r.recommendation,
        tag: r.sourceType === "BACKEND" ? "Backend" : "Local",
    };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const defaultWeekOptions = [
    formatDateRange(7),
    formatDateRange(7, new Date(Date.now() + 7 * DAY_MS)),
    formatDateRange(7, new Date(Date.now() + 14 * DAY_MS)),
    formatDateRange(7, new Date(Date.now() + 21 * DAY_MS)),
];

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
    const [selectedWeek, setSelectedWeek] = useState(defaultWeekOptions[0]);
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    const [scenarioRows, setScenarioRows] = useState<ScenarioRow[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<ScenarioRow | null>(null);
    const [addScenarioOpen, setAddScenarioOpen] = useState(false);
    const [forecastServiceRunning, setForecastServiceRunning] = useState(false);
    const [forecastServiceError, setForecastServiceError] = useState("");
    const [forecastServiceResult, setForecastServiceResult] = useState<WhatIfScenarioResponse | null>(null);
    const [localSimulationData, setLocalSimulationData] = useState<ProjectionPoint[] | null>(null);
    const [simulationRan, setSimulationRan] = useState(false);
    const [scenariosLoading, setScenariosLoading] = useState(true);
    const [scenarioSaveError, setScenarioSaveError] = useState("");

    // Load saved scenarios from backend on mount
    useEffect(() => {
        setScenariosLoading(true);
        getSimulationScenarios()
            .then((records) => {
                setScenarioRows(records.map(backendToRow));
            })
            .catch(() => {
                // Keep empty list — backend may not be deployed yet
            })
            .finally(() => setScenariosLoading(false));
    }, []);

    const [newScenario, setNewScenario] = useState({
        name: "",
        rainfallChange: "0",
        usageChange: "0",
        startingLevel: "78",
        efficiency: "88",
        forecastPeriod: "7 Days",
    });

    const sliderProjection = useMemo(
        () => buildProjection(startingLevel, efficiency, forecastPeriod),
        [startingLevel, efficiency, forecastPeriod],
    );

    const projectionData = localSimulationData ?? sliderProjection;

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

    function applyCustomRange() {
        if (customStartDate && customEndDate) {
            setSelectedWeek(`${customStartDate} - ${customEndDate}`);
        } else {
            setSelectedWeek("Custom week range");
        }

        setWeekModalOpen(false);
    }

    function runLocalSimulation() {
        const rainfallMm = Math.max(0, parseFloat(expectedRainfall) || 0);
        const usageM3 = Math.max(0, parseFloat(dailyUsage) || 0);
        const capacityM3 = Math.max(1, parseFloat(tankCapacity) || 100);
        const days = forecastPeriod;

        const data = buildPhysicsProjection(startingLevel, rainfallMm, usageM3, capacityM3, efficiency, days);
        setLocalSimulationData(data);
        setSimulationRan(true);
        setScenarioSaveError("");

        const simFinal = data.at(-1)?.value ?? startingLevel;
        const simLow = Math.min(...data.map((p) => p.value));
        const simHigh = Math.max(...data.map((p) => p.value));
        const overflowPct = simFinal > 92 ? 65 : simFinal > 80 ? 25 : 8;
        const shortagePct = simLow < 20 ? 80 : simLow < 35 ? 50 : 10;
        const overflowLabel = `${overflowPct >= 60 ? "High" : overflowPct >= 30 ? "Medium" : "Low"} (${overflowPct}%)`;
        const shortageLabel = `${shortagePct >= 60 ? "High" : shortagePct >= 30 ? "Medium" : "Low"} (${shortagePct}%)`;
        const recommendation =
            shortagePct >= 60 ? "Shortage risk is high. Reduce usage or prepare backup supply."
                : overflowPct >= 60 ? "Overflow risk is high. Monitor storage and drainage."
                    : "Scenario within acceptable operating range.";

        const payload = {
            scenarioName: "Main Simulation",
            sourceType: "LOCAL" as const,
            tankName: RAINWATER_TANK_NAME,
            startingLevelPercent: startingLevel,
            finalLevelPercent: simFinal,
            lowestLevelPercent: simLow,
            highestLevelPercent: simHigh,
            rainfallMm,
            dailyUsageM3: usageM3,
            tankCapacityM3: capacityM3,
            collectionEfficiencyPercent: efficiency,
            overflowRisk: overflowLabel,
            shortageRisk: shortageLabel,
            recommendation,
            projectionJson: JSON.stringify(data),
        };

        saveSimulationScenario(payload)
            .then((saved) => {
                setScenarioRows((prev) => {
                    const filtered = prev.filter((s) => s.name !== "Main Simulation");
                    return [backendToRow(saved), ...filtered];
                });
            })
            .catch(() => {
                // Backend unavailable — still show local row with temporary id
                setScenarioSaveError("Simulation ran locally. Could not save to backend (deploy updated JAR to Raspberry Pi).");
                const localRow: ScenarioRow = {
                    id: Date.now(),
                    name: "Main Simulation",
                    description: `Start ${startingLevel}% · Rain ${rainfallMm}mm · Usage ${usageM3}m³/day`,
                    finalLevel: `${simFinal}%`,
                    lowestLevel: `${simLow}%`,
                    overflowRisk: overflowLabel,
                    shortageRisk: shortageLabel,
                    rainfallChange: `${rainfallMm} mm`,
                    usageChange: `${usageM3} m³/day`,
                    efficiency: `${efficiency}%`,
                    forecastPeriod: `${days} Days`,
                    recommendation,
                    tag: "Local (unsaved)",
                };
                setScenarioRows((prev) => {
                    const filtered = prev.filter((s) => s.name !== "Main Simulation");
                    return [localRow, ...filtered];
                });
            });
    }

    function deleteScenario(id: number) {
        // Optimistic remove from UI
        setScenarioRows((prev) => prev.filter((scenario) => scenario.id !== id));
        deleteSimulationScenario(id).catch(() => {
            // If delete fails (e.g. local-only row with temp id), ignore silently
        });
    }

    function createScenario() {
        const rainfall = Number(newScenario.rainfallChange);
        const usage = Number(newScenario.usageChange);
        const start = Number(newScenario.startingLevel);
        const eff = Number(newScenario.efficiency);
        const days = Number.parseInt(newScenario.forecastPeriod) || 7;

        const scenarioProjection = buildPhysicsProjection(start, Math.max(0, rainfall), Math.max(0, usage), 100, eff, days);
        const scenarioFinal = scenarioProjection.at(-1)?.value ?? start;
        const scenarioLow = Math.min(...scenarioProjection.map((item) => item.value));
        const scenarioHigh = Math.max(...scenarioProjection.map((item) => item.value));
        const overflow = Math.max(2, Math.min(90, Math.round(scenarioFinal > 90 ? 45 : 8)));
        const shortage = Math.max(2, Math.min(90, Math.round(scenarioLow < 35 ? 55 : 10)));
        const overflowLabel = `${overflow > 40 ? "High" : overflow > 20 ? "Medium" : "Low"} (${overflow}%)`;
        const shortageLabel = `${shortage > 40 ? "High" : shortage > 20 ? "Medium" : "Low"} (${shortage}%)`;
        const scenarioName = newScenario.name.trim() || "Custom Scenario";
        const recommendation =
            shortage > 40
                ? "Shortage risk is high. Reduce usage or prepare alternative water supply."
                : overflow > 40
                    ? "Overflow risk is high. Monitor storage level and prepare drainage."
                    : "Scenario remains within acceptable operating range.";

        setAddScenarioOpen(false);
        setNewScenario({ name: "", rainfallChange: "0", usageChange: "0", startingLevel: "78", efficiency: "88", forecastPeriod: "7 Days" });

        saveSimulationScenario({
            scenarioName,
            sourceType: "LOCAL",
            tankName: RAINWATER_TANK_NAME,
            startingLevelPercent: start,
            finalLevelPercent: scenarioFinal,
            lowestLevelPercent: scenarioLow,
            highestLevelPercent: scenarioHigh,
            rainfallMm: Math.max(0, rainfall),
            dailyUsageM3: Math.max(0, usage),
            tankCapacityM3: 100,
            collectionEfficiencyPercent: eff,
            overflowRisk: overflowLabel,
            shortageRisk: shortageLabel,
            recommendation,
            projectionJson: JSON.stringify(scenarioProjection),
        })
            .then((saved) => {
                setScenarioRows((prev) => [...prev, backendToRow(saved)]);
            })
            .catch(() => {
                const localRow: ScenarioRow = {
                    id: Date.now(),
                    name: scenarioName,
                    description: `Rainfall ${rainfall >= 0 ? "+" : ""}${rainfall}%, usage ${usage >= 0 ? "+" : ""}${usage}%`,
                    finalLevel: `${scenarioFinal}%`,
                    lowestLevel: `${scenarioLow}%`,
                    overflowRisk: overflowLabel,
                    shortageRisk: shortageLabel,
                    rainfallChange: `${rainfall >= 0 ? "+" : ""}${rainfall}%`,
                    usageChange: `${usage >= 0 ? "+" : ""}${usage}%`,
                    efficiency: `${eff}%`,
                    forecastPeriod: newScenario.forecastPeriod,
                    recommendation,
                    tag: "Local (unsaved)",
                };
                setScenarioRows((prev) => [...prev, localRow]);
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

                                <button
                                    className="simulation-run-btn"
                                    type="button"
                                    onClick={runLocalSimulation}
                                >
                                    {simulationRan ? "Re-run Simulation" : "Run Simulation"}
                                </button>
                                {simulationRan && (
                                    <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                                        Simulation complete. Chart and scenario comparison updated.
                                    </p>
                                )}

                                <button
                                    className="simulation-run-btn"
                                    type="button"
                                    style={{ marginTop: "8px", opacity: 0.9 }}
                                    disabled={forecastServiceRunning}
                                    onClick={async () => {
                                        setForecastServiceRunning(true);
                                        setForecastServiceError("");
                                        setForecastServiceResult(null);
                                        try {
                                            const result = await getWhatIfScenario({
                                                scenarioName: "Backend Simulation",
                                                rainfallChangePercent: Number(expectedRainfall),
                                                usageChangePercent: Number(dailyUsage),
                                                startingTankLevelPercent: startingLevel,
                                                tankCapacityLitres: Number(tankCapacity) * 1000,
                                                collectionEfficiencyPercent: efficiency,
                                                forecastPeriodDays: forecastPeriod,
                                            });
                                            setForecastServiceResult(result);
                                            // Persist backend scenario to DB
                                            const scenarioName = result.scenarioName ?? "Backend Simulation";
                                            saveSimulationScenario({
                                                scenarioName,
                                                sourceType: "BACKEND",
                                                tankName: RAINWATER_TANK_NAME,
                                                startingLevelPercent: startingLevel,
                                                finalLevelPercent: result.projectedFinalLevel,
                                                lowestLevelPercent: result.lowestLevel,
                                                rainfallMm: Number(expectedRainfall),
                                                dailyUsageM3: Number(dailyUsage),
                                                tankCapacityM3: Number(tankCapacity),
                                                collectionEfficiencyPercent: efficiency,
                                                overflowRisk: `${result.overflowRisk} (${result.overflowRiskPercent}%)`,
                                                shortageRisk: `${result.shortageRisk} (${result.shortageRiskPercent}%)`,
                                                recommendation: result.recommendation,
                                                projectionJson: "[]",
                                            })
                                                .then((saved) => {
                                                    setScenarioRows((prev) => {
                                                        const filtered = prev.filter((s) => s.name !== scenarioName);
                                                        return [backendToRow(saved), ...filtered];
                                                    });
                                                })
                                                .catch(() => {
                                                    // Save failed — show in UI with temp id anyway
                                                    const fallbackRow: ScenarioRow = {
                                                        id: Date.now(),
                                                        name: scenarioName,
                                                        description: "Backend forecast service result",
                                                        finalLevel: `${result.projectedFinalLevel}%`,
                                                        lowestLevel: `${result.lowestLevel}%`,
                                                        overflowRisk: `${result.overflowRisk} (${result.overflowRiskPercent}%)`,
                                                        shortageRisk: `${result.shortageRisk} (${result.shortageRiskPercent}%)`,
                                                        rainfallChange: `${Number(expectedRainfall)}%`,
                                                        usageChange: `${Number(dailyUsage)}%`,
                                                        efficiency: `${efficiency}%`,
                                                        forecastPeriod: `${forecastPeriod} Days`,
                                                        recommendation: result.recommendation,
                                                        tag: "Backend (unsaved)",
                                                    };
                                                    setScenarioRows((prev) => {
                                                        const filtered = prev.filter((s) => s.name !== scenarioName);
                                                        return [fallbackRow, ...filtered];
                                                    });
                                                });
                                        } catch (err) {
                                            const msg = err instanceof Error ? err.message : String(err);
                                            const is503 = msg.includes("503");
                                            setForecastServiceError(is503
                                                ? "Backend forecast service unavailable (HTTP 503). Deploy the updated backend JAR to the Raspberry Pi and restart the service. Use 'Run Simulation' for local calculation in the meantime."
                                                : `Forecast service error: ${msg}`);
                                        } finally {
                                            setForecastServiceRunning(false);
                                        }
                                    }}
                                >
                                    {forecastServiceRunning ? "Running Forecast…" : "Run with Forecast Service"}
                                </button>

                                {forecastServiceError && (
                                    <p className="forecast-error-message" style={{ fontSize: "12px", color: "#dc2626", marginTop: "8px" }}>
                                        {forecastServiceError}
                                    </p>
                                )}

                                {forecastServiceResult && (
                                    <div style={{ marginTop: "10px", padding: "12px", background: "color-mix(in srgb, var(--purple) 6%, transparent)", borderRadius: "12px", border: "1px solid color-mix(in srgb, var(--purple) 15%, transparent)" }}>
                                        <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>Forecast Service Result</p>
                                        <div style={{ display: "grid", gap: "4px", fontSize: "12px" }}>
                                            <span>Final Level: <strong>{forecastServiceResult.projectedFinalLevel}%</strong></span>
                                            <span>Lowest Level: <strong>{forecastServiceResult.lowestLevel}%</strong></span>
                                            <span>Overflow Risk: <strong>{forecastServiceResult.overflowRisk} ({forecastServiceResult.overflowRiskPercent}%)</strong></span>
                                            <span>Shortage Risk: <strong>{forecastServiceResult.shortageRisk} ({forecastServiceResult.shortageRiskPercent}%)</strong></span>
                                        </div>
                                        <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>{forecastServiceResult.recommendation}</p>
                                        <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Baseline rule-based forecast service. This is not a trained ML model.</p>
                                    </div>
                                )}
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

                            {scenarioSaveError && (
                                <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "8px", padding: "6px 10px", background: "rgba(251,191,36,0.1)", borderRadius: "6px" }}>
                                    {scenarioSaveError}
                                </p>
                            )}

                            {scenariosLoading ? (
                                <div className="empty-state">
                                    <span>Loading saved scenarios…</span>
                                </div>
                            ) : scenarioRows.length === 0 ? (
                                <div className="empty-state">
                                    <strong>No saved scenarios yet</strong>
                                    <span>Click "Run Simulation" or "Add Scenario" to create and persist a scenario.</span>
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
                                                                <ArrowRight size={16} />
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
                            {defaultWeekOptions.map((week) => (
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

                            <div className="simulation-result-detail-row">
                                <span>Forecast Period</span>
                                <strong>{selectedScenario.forecastPeriod}</strong>
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
