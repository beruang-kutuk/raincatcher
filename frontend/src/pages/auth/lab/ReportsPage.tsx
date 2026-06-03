import { useEffect, useMemo, useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/reports.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import jsPDF from "jspdf";
import { getLatestTelemetry, type IotTelemetryReading } from "../../../services/iotTelemetryApi";
import { getBenchmarkForecast, type BenchmarkResponse } from "../../../services/forecastApi";
import { getRainfallWeather, type WeatherRecord } from "../../../services/weatherApi";
import {
    AlertCircle,
    BarChart3,
    Calendar,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock,
    CloudRain,
    Download,
    Eye,
    FileText,
    Inbox,
    Mail,
    PieChart,
    RefreshCw,
    Sparkles,
    Waves,
    X,
} from "lucide-react";
import {
    createPendingReportRow,
    quickReportDefinitions,
    type QuickReportId,
    type GeneratedReportRow,
} from "../../../services/reportPlaceholders";
import { saveFrontendPlaceholder } from "../../../services/frontendPersistence";
import {
    generateReport,
    getReportHistory,
    getReportSummary,
    type ReportRecord,
    type ReportSummary,
} from "../../../services/reportsApi";
import { buildBackendUrl } from "../../../services/apiConfig";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import {
    formatCurrentDateTime,
    formatDateRange,
} from "../../../services/time";

type SummaryCard = {
    label: string;
    value: string;
    meta: string;
    icon: React.ReactNode;
    tone: "purple" | "blue" | "green" | "violet";
};

type QuickReport = {
    id: QuickReportId;
    title: string;
    description: string;
    icon: React.ReactNode;
    tone: "blue" | "red" | "orange" | "green";
};

const reportSections = [
    "Executive Summary",
    "Telemetry Summary",
    "Forecast Benchmark",
    "Anomaly Review",
    "Camera References",
    "AI Recommendations",
];

type ReadinessKey = "telemetry" | "camera" | "forecast" | "anomaly" | "ai";

type ReadinessItem = {
    key: ReadinessKey;
    label: string;
    status: "pending" | "ready";
};

const defaultReadiness: ReadinessItem[] = [
    { key: "telemetry", label: "Telemetry Input", status: "pending" },
    { key: "camera", label: "Camera Images", status: "pending" },
    { key: "forecast", label: "Forecast Output", status: "pending" },
    { key: "anomaly", label: "Anomaly Review", status: "pending" },
    { key: "ai", label: "AI Recommendation", status: "pending" },
];

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const monthDates = Array.from({ length: 28 }, (_, i) => String(i + 1));

function SummaryMetricCard({ label, value, meta, icon, tone }: SummaryCard) {
    return (
        <div className="reports-summary-card">
            <div className={`reports-summary-icon reports-tone-${tone}`}>{icon}</div>

            <div className="reports-summary-content">
                <p className="reports-summary-label">{label}</p>
                <h3 className="reports-summary-value">{value}</h3>
                <p className="reports-summary-meta">{meta}</p>
            </div>
        </div>
    );
}

function ReportsOverviewChart() {
    return (
        <div className="reports-chart-shell">
            <div className="empty-state compact">
                <strong>No report chart data yet</strong>
                <span>Storage, rainfall, and benchmark charts will render from connected report inputs.</span>
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [reportType, setReportType] = useState("Weekly Performance");
    const [selectedSections, setSelectedSections] = useState(reportSections);

    // Real telemetry and forecast service state
    const [latestTelemetry, setLatestTelemetry] = useState<IotTelemetryReading | null>(null);
    const [rainfallWeather, setRainfallWeather] = useState<WeatherRecord | null>(null);
    const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
    const [reportHistory, setReportHistory] = useState<ReportRecord[]>([]);
    const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResponse | null>(null);
    const [benchmarkLoading, setBenchmarkLoading] = useState(false);
    const [benchmarkError, setBenchmarkError] = useState("");

    const [readiness, setReadiness] = useState<ReadinessItem[]>(defaultReadiness);
    const [missingInputsOpen, setMissingInputsOpen] = useState(false);
    const [readinessChecked, setReadinessChecked] = useState(false);

    const [dailyAutoReport, setDailyAutoReport] = useState(false);
    const [weeklyDay, setWeeklyDay] = useState("Monday");
    const [monthlyDate, setMonthlyDate] = useState("1");
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const [scheduleSaved, setScheduleSaved] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [pdfGenerated, setPdfGenerated] = useState(false);
    const [reportsActionMessage, setReportsActionMessage] = useState("");

    const missingInputs = readiness.filter((item) => item.status === "pending");
    const allReady = missingInputs.length === 0;

    // Load telemetry on mount and check real readiness from backend
    useEffect(() => {
        let active = true;

        Promise.allSettled([getLatestTelemetry(), getRainfallWeather(), getReportSummary(), getReportHistory()])
            .then(([telemetryResult, weatherResult, summaryResult, historyResult]) => {
                if (!active) return;
                if (telemetryResult.status === "fulfilled") setLatestTelemetry(telemetryResult.value);
                if (weatherResult.status === "fulfilled") setRainfallWeather(weatherResult.value);
                if (summaryResult.status === "fulfilled") setReportSummary(summaryResult.value);
                if (historyResult.status === "fulfilled") setReportHistory(historyResult.value);
            });

        fetch(buildBackendUrl("/api/reports/readiness"))
            .then((r) => r.ok ? r.json() : null)
            .then((data: Record<string, { status: string }> | null) => {
                if (!active || !data) return;
                setReadiness(defaultReadiness.map((item) => {
                    const entry = data[item.key];
                    if (entry && entry.status === "ready") return { ...item, status: "ready" as const };
                    return item;
                }));
                setReadinessChecked(true);
            })
            .catch(() => { /* keep default pending */ });

        return () => { active = false; };
    }, []);

    function handleCheckReadiness() {
        setReadinessChecked(true);
        fetch(buildBackendUrl("/api/reports/readiness"))
            .then((r) => r.ok ? r.json() : null)
            .then((data: Record<string, { status: string; detail?: string }> | null) => {
                if (!data) return;
                setReadiness(defaultReadiness.map((item) => {
                    const apiKey = item.key === "ai" ? "ai" : item.key;
                    const entry = data[apiKey];
                    if (entry && entry.status === "ready") return { ...item, status: "ready" as const };
                    return item;
                }));
            })
            .catch(() => {
                // fallback: mark telemetry ready based on local state
                setReadiness(defaultReadiness.map((item) =>
                    item.key === "telemetry" && latestTelemetry ? { ...item, status: "ready" as const } : item,
                ));
            });
    }

    async function runBenchmark() {
        if (!latestTelemetry) return;
        setBenchmarkLoading(true);
        setBenchmarkError("");
        try {
            const result = await getBenchmarkForecast({
                observedLevelPercent: latestTelemetry.waterLevelPercent,
            });
            setBenchmarkResult(result);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setBenchmarkError(`Forecast benchmark unavailable. ${msg}`);
        } finally {
            setBenchmarkLoading(false);
        }
    }

    async function handleSaveSchedule() {
        setScheduleSaving(true);
        setReportsActionMessage("");

        try {
            await saveFrontendPlaceholder("Report schedule", {
                dailyAutoReport,
                weeklyDay,
                monthlyDate,
            });
            setScheduleSaved(true);
            setReportsActionMessage("Saved successfully. Report schedule is ready for backend scheduler persistence.");
            globalThis.setTimeout(() => setScheduleSaved(false), 2200);
        } catch {
            setReportsActionMessage("Report schedule could not be saved. Backend placeholder action is ready to retry.");
        } finally {
            setScheduleSaving(false);
        }
    }

    const dateRange = formatDateRange(7);
    const generatedOn = formatCurrentDateTime();

    const backendReportRows: GeneratedReportRow[] = useMemo(() => reportHistory.map((row) => ({
        id: String(row.id),
        name: row.reportType,
        type: row.reportType,
        tanks: RAINWATER_TANK_NAME,
        range: row.dateRange || dateRange,
        generatedOn: row.createdAt,
        size: "Backend JSON",
        sourceTags: [],
    })), [reportHistory, dateRange]);

    const summaryCards: SummaryCard[] = useMemo(() => [
        {
            label: "Generated Reports",
            value: String(reportSummary?.generatedReportCount ?? backendReportRows.length),
            meta: backendReportRows.length === 0 ? "No backend report history yet" : "Saved backend reports",
            icon: <FileText size={22} />,
            tone: "purple",
        },
        {
            label: "Forecast Benchmark",
            value: benchmarkResult?.accuracyPercent !== undefined ? `${Number(benchmarkResult.accuracyPercent).toFixed(1)}%` : "Pending",
            meta: benchmarkResult?.recommendation ?? "Requires forecast and observed telemetry",
            icon: <PieChart size={22} />,
            tone: "blue",
        },
        {
            label: "Storage Summary",
            value: latestTelemetry ? `${latestTelemetry.waterLevelPercent.toFixed(1)}%` : "--",
            meta: latestTelemetry ? "Latest ESP32 ultrasonic level" : "Requires ultrasonic water level input",
            icon: <Waves size={22} />,
            tone: "green",
        },
        {
            label: "Rainfall Summary",
            value: typeof rainfallWeather?.rainfallAmount === "number" ? `${rainfallWeather.rainfallAmount.toFixed(1)} mm` : "--",
            meta: rainfallWeather ? "Saved AccuWeather rainfall record" : "Requires weather or rainfall input",
            icon: <CloudRain size={22} />,
            tone: "violet",
        },
    ], [backendReportRows.length, benchmarkResult, latestTelemetry, rainfallWeather, reportSummary]);

    const quickReports: QuickReport[] = quickReportDefinitions.map((item, index) => ({
        ...item,
        icon: index === 2 ? <BarChart3 size={18} /> : <FileText size={18} />,
        tone: (["blue", "red", "orange", "green"] as const)[index],
    }));

    const pendingReport = createPendingReportRow(reportType);

    async function generatePdfReport() {
        setPdfGenerating(true);
        setReportsActionMessage("");

        try {
            const savedReport = await generateReport({
                reportType,
                tankId: RAINWATER_TANK_NAME,
                dateRange,
                selectedSections,
            });
            setReportHistory((prev) => [savedReport, ...prev.filter((item) => item.id !== savedReport.id)]);

            const doc = new jsPDF("p", "mm", "a4");
            const pageWidth = doc.internal.pageSize.getWidth();
            const marginX = 14;

            doc.setFillColor(176, 138, 69);
            doc.rect(0, 0, pageWidth, 38, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("Raincatcher Report Placeholder", marginX, 16);
            doc.setFontSize(9);
            doc.text(`Generated: ${generatedOn}`, marginX, 26);

            doc.setTextColor(11, 18, 32);
            doc.setFontSize(14);
            doc.text(reportType, marginX, 52);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`Tank: ${RAINWATER_TANK_NAME}`, marginX, 62);
            doc.text(`Date range: ${dateRange}`, marginX, 70);
            doc.text(
                "Real report metrics will be populated after telemetry, camera, forecast, and anomaly services are connected.",
                marginX,
                84,
                { maxWidth: pageWidth - marginX * 2 },
            );

            doc.save(`${reportType.toLowerCase().replaceAll(" ", "-")}.pdf`);
            setPdfGenerated(true);
            setReportsActionMessage("PDF generated successfully.");
            globalThis.setTimeout(() => setPdfGenerated(false), 2200);
        } catch {
            setReportsActionMessage("PDF could not be generated. Report export placeholder is ready to retry.");
        } finally {
            setPdfGenerating(false);
        }
    }

    function toggleSection(section: string) {
        setSelectedSections((prev) =>
            prev.includes(section)
                ? prev.filter((item) => item !== section)
                : [...prev, section],
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
                    <div className="reports-page page-container">
                        <div className="reports-topbar">
                            <div>
                                <h1 className="reports-page-title">Reports</h1>
                            </div>

                            <div className="reports-topbar-right">
                                <button className="reports-filter-btn" type="button">
                                    {dateRange}
                                </button>

                                <button className="reports-filter-btn" type="button">
                                    {RAINWATER_TANK_NAME}
                                </button>

                                <div className="dashboard-actions">
                                    <ProfileMenu />
                                </div>
                            </div>
                        </div>

                        <div className="reports-summary-grid">
                            {summaryCards.map((item) => (
                                <SummaryMetricCard key={item.label} {...item} />
                            ))}
                        </div>

                        <section className="reports-benchmark-panel">
                            <div className="reports-benchmark-left">
                                <div className="reports-benchmark-icon">
                                    <Sparkles size={22} />
                                </div>

                                <div>
                                    <h2>Forecast vs Actual Benchmark</h2>
                                    <p>
                                        {latestTelemetry
                                            ? "Telemetry available. Run benchmark to compare forecast service output against observed water level."
                                            : "Benchmark reporting is ready for connected forecast output and observed telemetry values."}
                                    </p>
                                    {latestTelemetry && !benchmarkResult && (
                                        <button
                                            type="button"
                                            className="reports-preview-btn"
                                            style={{ marginTop: "8px" }}
                                            disabled={benchmarkLoading}
                                            onClick={() => void runBenchmark()}
                                        >
                                            <RefreshCw size={14} />
                                            <span>{benchmarkLoading ? "Running…" : "Run Benchmark"}</span>
                                        </button>
                                    )}
                                    {benchmarkError && (
                                        <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>{benchmarkError}</p>
                                    )}
                                </div>
                            </div>

                            <div className="reports-benchmark-grid">
                                <div className="reports-benchmark-card">
                                    <div className="reports-benchmark-card-top">
                                        <h3>Input status</h3>
                                        <span className={benchmarkResult ? "reports-benchmark-good" : "reports-benchmark-moderate"}>
                                            {benchmarkResult ? "ready" : "pending"}
                                        </span>
                                    </div>

                                    <div className="reports-benchmark-values">
                                        <div>
                                            <span>Forecast</span>
                                            <strong>
                                                {benchmarkResult && benchmarkResult.forecastedLevelPercent !== undefined
                                                    ? String(benchmarkResult.forecastedLevelPercent)
                                                    : "--"}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Observed</span>
                                            <strong>
                                                {latestTelemetry
                                                    ? `${latestTelemetry.waterLevelPercent.toFixed(1)}%`
                                                    : "--"}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Deviation</span>
                                            <strong>
                                                {benchmarkResult && benchmarkResult.deviationPercent !== undefined
                                                    ? `${String(benchmarkResult.deviationPercent)}%`
                                                    : "--"}
                                            </strong>
                                        </div>
                                    </div>

                                    {benchmarkResult?.recommendation && (
                                        <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
                                            {benchmarkResult.recommendation}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="reports-main-grid">
                            <div className="reports-left-column">
                                <section className="reports-panel">
                                    <div className="reports-panel-header reports-panel-header-split">
                                        <h2>Storage & Rainfall Overview</h2>

                                        <button className="reports-filter-btn small" type="button">
                                            {latestTelemetry || rainfallWeather ? "Backend inputs" : "Input pending"}
                                        </button>
                                    </div>

                                    <div className="reports-legend">
                                        <span><i className="reports-legend-line" /> Storage Level (%)</span>
                                        <span><i className="reports-legend-bar" /> Rainfall (mm)</span>
                                    </div>

                                    <ReportsOverviewChart />
                                </section>

                                <section className="reports-panel">
                                    <div className="reports-panel-header">
                                        <h2>Generated Reports</h2>
                                    </div>

                                    {backendReportRows.length === 0 ? (
                                        <div className="empty-state">
                                            <strong>No generated reports yet</strong>
                                            <span>
                                                Generated reports will appear after backend report generation runs.
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="reports-table-wrap">
                                                <table className="reports-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Report Name</th>
                                                            <th>Type</th>
                                                            <th>Tanks</th>
                                                            <th>Date Range</th>
                                                            <th>Generated On</th>
                                                            <th>Size</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {backendReportRows.map((row) => (
                                                            <tr key={row.id}>
                                                                <td>{row.name}</td>
                                                                <td>{row.type}</td>
                                                                <td>{row.tanks}</td>
                                                                <td>{row.range}</td>
                                                                <td>{row.generatedOn}</td>
                                                                <td>{row.size}</td>
                                                                <td>
                                                                    <div className="reports-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="reports-icon-btn"
                                                                            onClick={() => setPreviewOpen(true)}
                                                                            title="Preview"
                                                                        >
                                                                            <Eye size={16} />
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            className="reports-icon-btn"
                                                                            title="Download"
                                                                            disabled={pdfGenerating}
                                                                            onClick={() => void generatePdfReport()}
                                                                        >
                                                                            <Download size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="reports-table-footer">
                                                <p>
                                                    Showing 1 to {backendReportRows.length} of {backendReportRows.length} results
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </section>

                                <section className="reports-panel">
                                    <div className="reports-panel-header">
                                        <h2><Calendar size={16} className="reports-panel-icon" /> Report Schedule</h2>
                                    </div>

                                    <div className="reports-schedule-grid">
                                        <div className="reports-schedule-row">
                                            <div>
                                                <strong>Daily auto-report</strong>
                                                <span>Generate a summary report each day automatically.</span>
                                            </div>

                                            <button
                                                type="button"
                                                className={`reports-toggle ${dailyAutoReport ? "active" : ""}`}
                                                onClick={() => setDailyAutoReport((prev) => !prev)}
                                                aria-pressed={dailyAutoReport}
                                            >
                                                <i />
                                            </button>
                                        </div>

                                        <label className="reports-schedule-field">
                                            Weekly report day
                                            <select
                                                className="reports-select"
                                                value={weeklyDay}
                                                onChange={(e) => setWeeklyDay(e.target.value)}
                                            >
                                                {weekDays.map((day) => (
                                                    <option key={day}>{day}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="reports-schedule-field">
                                            Monthly report date
                                            <select
                                                className="reports-select"
                                                value={monthlyDate}
                                                onChange={(e) => setMonthlyDate(e.target.value)}
                                            >
                                                {monthDates.map((day) => (
                                                    <option key={day}>{day}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <div className="reports-schedule-next">
                                            <Clock size={14} />
                                            <span>Next scheduled report: <strong>Pending backend scheduler</strong></span>
                                        </div>
                                    </div>

                                    <div className="reports-generate-actions reports-single-action">
                                        <button
                                            type="button"
                                            className="reports-generate-btn"
                                            onClick={() => void handleSaveSchedule()}
                                            disabled={scheduleSaving}
                                        >
                                            {scheduleSaving
                                                ? <RefreshCw size={15} />
                                                : scheduleSaved
                                                    ? <CheckCircle2 size={15} />
                                                    : <Calendar size={15} />}
                                            <span>
                                                {scheduleSaving
                                                    ? "Saving..."
                                                    : scheduleSaved
                                                        ? "Saved successfully"
                                                        : "Save Schedule"}
                                            </span>
                                        </button>
                                    </div>
                                    {reportsActionMessage && (
                                        <div className="reports-action-feedback">{reportsActionMessage}</div>
                                    )}
                                </section>

                                <section className="reports-panel">
                                    <div className="reports-panel-header">
                                        <h2><Inbox size={16} className="reports-panel-icon" /> Export Center</h2>
                                    </div>

                                    {backendReportRows.length === 0 ? (
                                        <div className="empty-state compact">
                                            <strong>No exports available yet</strong>
                                            <span>Generated report files will appear here once backend report generation is connected.</span>
                                        </div>
                                    ) : (
                                        <div className="reports-export-list">
                                            <button type="button" className="reports-export-item">
                                                <FileText size={16} />
                                                <span>Download latest PDF</span>
                                                <Download size={14} className="reports-export-arrow" />
                                            </button>

                                            <button type="button" className="reports-export-item">
                                                <FileText size={16} />
                                                <span>Download latest CSV</span>
                                                <Download size={14} className="reports-export-arrow" />
                                            </button>

                                            <button type="button" className="reports-export-item">
                                                <Download size={16} />
                                                <span>Download all reports</span>
                                                <Download size={14} className="reports-export-arrow" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="reports-generate-actions reports-single-action">
                                        <button type="button" className="reports-preview-btn" disabled>
                                            <Mail size={15} />
                                            <span>Send to Email</span>
                                        </button>
                                    </div>

                                    <small className="reports-export-note">Email delivery pending backend integration.</small>
                                </section>
                            </div>

                            <div className="reports-right-column">
                                <section className="reports-panel">
                                    <div className="reports-panel-header">
                                        <h2>Generate New Report</h2>
                                    </div>

                                    <div className="reports-form-group">
                                        <label>Report Type</label>
                                        <select
                                            className="reports-select"
                                            value={reportType}
                                            onChange={(e) => setReportType(e.target.value)}
                                        >
                                            <option>Daily Summary</option>
                                            <option>Weekly Performance</option>
                                            <option>Forecast Benchmark</option>
                                            <option>Anomaly Report</option>
                                        </select>
                                    </div>

                                    <div className="reports-form-group">
                                        <label>Select Tank</label>
                                        <select
                                            className="reports-select"
                                            value={RAINWATER_TANK_NAME}
                                            onChange={() => undefined}
                                        >
                                            <option>{RAINWATER_TANK_NAME}</option>
                                        </select>
                                    </div>

                                    <div className="reports-form-group">
                                        <label>Date Range</label>
                                        <div className="reports-input-icon">
                                            <CalendarDays size={16} />
                                            <input
                                                type="text"
                                                value={dateRange}
                                                readOnly
                                                className="reports-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="reports-form-group">
                                        <label>Include Sections</label>

                                        <div className="reports-checkbox-grid">
                                            {reportSections.map((item) => (
                                                <label key={item} className="reports-checkbox-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSections.includes(item)}
                                                        onChange={() => toggleSection(item)}
                                                    />
                                                    <span>{item}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="reports-generate-actions">
                                        <button
                                            className="reports-preview-btn"
                                            type="button"
                                            onClick={() => setPreviewOpen(true)}
                                        >
                                            <Eye size={16} />
                                            <span>Preview</span>
                                        </button>

                                        <button
                                            className="reports-generate-btn"
                                            type="button"
                                            disabled={pdfGenerating}
                                            onClick={() => void generatePdfReport()}
                                        >
                                            {pdfGenerating ? <RefreshCw size={16} /> : <Download size={16} />}
                                            <span>
                                                {pdfGenerating
                                                    ? "Generating..."
                                                    : pdfGenerated
                                                        ? "Generated"
                                                        : "Generate PDF"}
                                            </span>
                                        </button>
                                    </div>
                                    {reportsActionMessage && (
                                        <div className="reports-action-feedback">{reportsActionMessage}</div>
                                    )}
                                </section>

                                <section className="reports-panel">
                                    <div className="reports-panel-header">
                                        <h2>Quick Reports</h2>
                                    </div>

                                    <div className="reports-quick-list">
                                        {quickReports.map((item) => (
                                            <button
                                                key={item.id}
                                                className="reports-quick-item"
                                                type="button"
                                                onClick={() => {
                                                    setReportType(item.title);
                                                    setPreviewOpen(true);
                                                }}
                                            >
                                                <div className={`reports-quick-icon reports-tone-${item.tone}`}>
                                                    {item.icon}
                                                </div>

                                                <div className="reports-quick-content">
                                                    <h3>{item.title}</h3>
                                                    <p>{item.description}</p>
                                                </div>

                                                <ChevronRight size={18} className="reports-quick-arrow" />
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="reports-panel">
                                    <div className="reports-panel-header">
                                        <h2>Report Readiness</h2>
                                    </div>

                                    <div className="reports-readiness-list">
                                        {readiness.map((item) => (
                                            <div key={item.key} className="reports-readiness-row">
                                                {item.status === "ready"
                                                    ? <CheckCircle2 size={16} className="reports-readiness-ok" />
                                                    : <AlertCircle size={16} className="reports-readiness-warn" />
                                                }

                                                <span>{item.label}</span>

                                                <span className={`reports-readiness-pill ${item.status === "ready" ? "ready" : "pending"}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {readinessChecked && !allReady && (
                                        <p className="reports-readiness-note">
                                            {missingInputs.length} input{missingInputs.length !== 1 ? "s" : ""} pending before generating a reliable report.
                                        </p>
                                    )}

                                    <div className="reports-readiness-actions">
                                        <button
                                            type="button"
                                            className="reports-preview-btn"
                                            onClick={handleCheckReadiness}
                                        >
                                            <RefreshCw size={15} />
                                            <span>Check Readiness</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="reports-secondary-btn"
                                            onClick={() => setMissingInputsOpen(true)}
                                        >
                                            View Missing Inputs
                                        </button>
                                    </div>
                                </section>


                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {missingInputsOpen && (
                <div className="reports-preview-backdrop">
                    <div className="reports-preview-modal" style={{ maxWidth: 480 }}>
                        <div className="reports-preview-header">
                            <div>
                                <h2>Missing Inputs</h2>
                                <p>These inputs are required before generating a reliable report.</p>
                            </div>

                            <button
                                type="button"
                                className="reports-preview-close"
                                onClick={() => setMissingInputsOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="reports-readiness-list">
                            {missingInputs.length === 0 ? (
                                <div className="empty-state compact">
                                    <strong>All inputs ready</strong>
                                    <span>No missing inputs detected.</span>
                                </div>
                            ) : (
                                missingInputs.map((item) => (
                                    <div key={item.key} className="reports-readiness-row">
                                        <AlertCircle size={16} className="reports-readiness-warn" />
                                        <span>{item.label}</span>
                                        <span className="reports-readiness-pill pending">pending</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="reports-preview-actions">
                            <button
                                type="button"
                                className="reports-preview-secondary"
                                onClick={() => setMissingInputsOpen(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewOpen && (
                <div className="reports-preview-backdrop">
                    <div className="reports-preview-modal">
                        <div className="reports-preview-header">
                            <div>
                                <h2>Report Preview</h2>
                                <p>{reportType} - {RAINWATER_TANK_NAME}</p>
                            </div>

                            <button
                                type="button"
                                className="reports-preview-close"
                                onClick={() => setPreviewOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="reports-pdf-preview">
                            <div className="reports-pdf-cover">
                                <h1>Raincatcher Monitoring Report</h1>
                                <p>{pendingReport.range}</p>
                                <span>{pendingReport.tanks}</span>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Input Status</h3>

                                <div className="reports-pdf-metrics">
                                    <div>
                                        <span>Generated</span>
                                        <strong>{pendingReport.generatedOn}</strong>
                                    </div>

                                    <div>
                                        <span>Storage</span>
                                        <strong>--</strong>
                                    </div>

                                    <div>
                                        <span>Water Quality</span>
                                        <strong>--</strong>
                                    </div>

                                    <div>
                                        <span>Anomalies</span>
                                        <strong>0</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Included Sections</h3>

                                <div className="reports-pdf-tags">
                                    {selectedSections.map((section) => (
                                        <span key={section}>{section}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Recommendation Summary</h3>
                                <p>
                                    AI-generated report recommendations will appear after telemetry, forecast, weather, and anomaly services are connected.
                                </p>
                            </div>
                        </div>

                        <div className="reports-preview-actions">
                            <button
                                type="button"
                                className="reports-preview-secondary"
                                onClick={() => setPreviewOpen(false)}
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                className="reports-generate-btn"
                                disabled={pdfGenerating}
                                onClick={() => void generatePdfReport()}
                            >
                                {pdfGenerating ? <RefreshCw size={16} /> : <Download size={16} />}
                                <span>{pdfGenerating ? "Generating..." : "Download PDF"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
