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
import {
    getAnomalySummary,
    type AnomalySummary,
} from "../../../services/anomalyApi";
import {
    getCameraRecordHistory,
    type CameraRecord,
} from "../../../services/cameraRecordsApi";
import {
    getReportAiSummary,
    type AiReportSummaryResponse,
} from "../../../services/aiApi";
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

type ReportSummaryCard = {
    label: string;
    value: string;
    meta: string;
};

type ReportTableRow = {
    metric: string;
    value: string;
    remarks: string;
    status: string;
};

type ReportTemplateData = {
    title: string;
    reportType: string;
    tank: string;
    dateRange: string;
    generatedOn: string;
    executiveSummary: string;
    summaryCards: ReportSummaryCard[];
    metricRows: ReportTableRow[];
    benchmarkRows: ReportTableRow[];
    anomalyRows: ReportTableRow[];
    includedSections: string[];
    recommendations: string[];
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

function asFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function formatReportNumber(value: unknown, unit = "", digits = 1) {
    const numberValue = asFiniteNumber(value);
    if (numberValue === null) return "--";
    return `${numberValue.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}

function formatReportPercent(value: unknown, digits = 1) {
    const numberValue = asFiniteNumber(value);
    if (numberValue === null) return "--";
    return `${numberValue.toFixed(digits)}%`;
}

function valueStatus(value: number | null, warning: boolean) {
    if (value === null) return "pending";
    return warning ? "review" : "normal";
}

function buildRecommendations(input: {
    latestTelemetry: IotTelemetryReading | null;
    rainfallWeather: WeatherRecord | null;
    anomalySummary: AnomalySummary | null;
    benchmarkResult: BenchmarkResponse | null;
    cameraRecords: CameraRecord[];
    aiReportSummary: AiReportSummaryResponse | null;
}) {
    const recommendations = new Set<string>();
    const telemetry = input.latestTelemetry;
    const anomalySummary = input.anomalySummary;
    const latestCamera = input.cameraRecords[0];
    const deviation = asFiniteNumber(input.benchmarkResult?.deviationPercent);

    if (telemetry?.waterLevelPercent !== undefined && telemetry.waterLevelPercent < 25) {
        recommendations.add("Storage is low. Inspect intake flow and reduce optional water usage until recovery is confirmed.");
    }
    if (telemetry?.ph !== undefined && (telemetry.ph < 6.5 || telemetry.ph > 8.5)) {
        recommendations.add("pH is outside the normal range. Verify the pH probe and inspect the water source before use.");
    }
    if (telemetry?.turbidity !== undefined && telemetry.turbidity > 100) {
        recommendations.add("Turbidity is elevated. Check the tank for sediment, debris, or filter blockage.");
    }
    if ((anomalySummary?.high ?? 0) > 0) {
        recommendations.add("High-severity anomalies are active. Prioritize inspection and record the resolution action.");
    } else if ((anomalySummary?.active ?? 0) > 0) {
        recommendations.add("Review active anomalies and close resolved cases after physical verification.");
    }
    if (deviation !== null && deviation > 8) {
        recommendations.add("Forecast deviation is above target. Recheck calibration and compare the forecast assumptions against recent rainfall.");
    }
    if (latestCamera && latestCamera.severity && latestCamera.severity !== "low" && latestCamera.severity !== "normal") {
        recommendations.add("Camera analysis needs review. Check camera angle, lens clarity, lighting, and tank visibility.");
    }
    input.aiReportSummary?.recommendedActions?.forEach((action) => recommendations.add(action));

    if (recommendations.size === 0) {
        recommendations.add("Continue normal monitoring and keep telemetry, camera, forecast, and anomaly checks connected.");
        recommendations.add("Use weekly exports to compare storage trend, rainfall input, and forecast deviation over time.");
    }

    return Array.from(recommendations).slice(0, 6);
}

function buildReportTemplateData(input: {
    reportType: string;
    tank: string;
    dateRange: string;
    generatedOn: string;
    selectedSections: string[];
    latestTelemetry: IotTelemetryReading | null;
    rainfallWeather: WeatherRecord | null;
    anomalySummary: AnomalySummary | null;
    benchmarkResult: BenchmarkResponse | null;
    cameraRecords: CameraRecord[];
    aiReportSummary: AiReportSummaryResponse | null;
}): ReportTemplateData {
    const telemetry = input.latestTelemetry;
    const anomalySummary = input.anomalySummary;
    const cameraRecords = input.cameraRecords;
    const latestCamera = cameraRecords[0];
    const activeAnomalies = anomalySummary?.active ?? 0;
    const forecastAccuracy = formatReportPercent(input.benchmarkResult?.accuracyPercent);
    const forecastDeviation = formatReportPercent(input.benchmarkResult?.deviationPercent);
    const storageLevel = formatReportPercent(telemetry?.waterLevelPercent);
    const rainfallAmount = formatReportNumber(input.rainfallWeather?.rainfallAmount, "mm");
    const phValue = formatReportNumber(telemetry?.ph, "pH", 2);
    const turbidityValue = formatReportNumber(telemetry?.turbidity, "NTU");

    const typeLower = input.reportType.toLowerCase();
    const typeFocus = typeLower.includes("anomaly")
        ? "The focus is anomaly severity, current case status, and recommended follow-up."
        : typeLower.includes("benchmark")
            ? "The focus is forecast accuracy against the latest observed ESP32 water-level reading."
            : typeLower.includes("weekly")
                ? "The focus is weekly operating performance across storage, weather, camera, and anomaly inputs."
                : "The focus is the latest daily operating state and readiness of connected monitoring inputs.";

    const executiveSummary = [
        `${input.reportType} for ${input.tank} covers ${input.dateRange}.`,
        telemetry
            ? `Latest telemetry reports ${storageLevel} storage, ${phValue}, ${turbidityValue}, and ${formatReportNumber(telemetry.waterTemperature, "C")} water temperature.`
            : "No ESP32 telemetry reading is available yet.",
        input.rainfallWeather
            ? `Saved rainfall input is ${rainfallAmount} with ${formatReportPercent(input.rainfallWeather.rainfallProbability, 0)} probability.`
            : "Rainfall input is not available yet.",
        input.benchmarkResult
            ? `Forecast benchmark accuracy is ${forecastAccuracy} with ${forecastDeviation} deviation.`
            : "Forecast benchmark has not been run for this session.",
        activeAnomalies > 0
            ? `${activeAnomalies} active anomaly case${activeAnomalies !== 1 ? "s" : ""} require review.`
            : "No active anomaly case is currently reported.",
        `${cameraRecords.length} camera record${cameraRecords.length !== 1 ? "s" : ""} are available for visual reference.`,
        typeFocus,
    ].join(" ");

    const metricRows: ReportTableRow[] = [
        {
            metric: "Storage Level",
            value: storageLevel,
            remarks: telemetry ? "Latest ESP32 ultrasonic water-level reading." : "Waiting for ESP32 telemetry.",
            status: valueStatus(asFiniteNumber(telemetry?.waterLevelPercent), Boolean(telemetry && telemetry.waterLevelPercent < 25)),
        },
        {
            metric: "pH",
            value: phValue,
            remarks: telemetry ? "Water quality pH sensor reading." : "Waiting for water quality telemetry.",
            status: valueStatus(asFiniteNumber(telemetry?.ph), Boolean(telemetry && (telemetry.ph < 6.5 || telemetry.ph > 8.5))),
        },
        {
            metric: "Turbidity",
            value: turbidityValue,
            remarks: telemetry ? "Water clarity from turbidity sensor." : "Waiting for turbidity telemetry.",
            status: valueStatus(asFiniteNumber(telemetry?.turbidity), Boolean(telemetry && telemetry.turbidity > 100)),
        },
        {
            metric: "Rainfall",
            value: rainfallAmount,
            remarks: input.rainfallWeather?.weatherCondition ?? "Waiting for saved weather or rainfall input.",
            status: input.rainfallWeather ? "ready" : "pending",
        },
        {
            metric: "Camera Records",
            value: String(cameraRecords.length),
            remarks: latestCamera?.aiRecommendation ?? "Saved camera records and ML recommendations will appear after capture.",
            status: cameraRecords.length > 0 ? "ready" : "pending",
        },
        {
            metric: "Active Anomalies",
            value: String(activeAnomalies),
            remarks: activeAnomalies > 0 ? "Open anomaly cases are present." : "No active anomaly cases in the summary.",
            status: activeAnomalies > 0 ? "review" : "normal",
        },
    ];

    const forecastedLevel = formatReportPercent(input.benchmarkResult?.forecastedLevelPercent);
    const observedLevel = formatReportPercent(input.benchmarkResult?.observedLevelPercent ?? telemetry?.waterLevelPercent);
    const deviationNumber = asFiniteNumber(input.benchmarkResult?.deviationPercent);
    const benchmarkRows: ReportTableRow[] = [
        {
            metric: "Storage Forecast",
            value: forecastedLevel,
            remarks: `Observed storage is ${observedLevel}. Deviation is ${forecastDeviation}.`,
            status: input.benchmarkResult ? (deviationNumber !== null && deviationNumber > 8 ? "review" : "good") : "pending",
        },
        {
            metric: "Forecast Accuracy",
            value: forecastAccuracy,
            remarks: input.benchmarkResult?.recommendation ?? "Run benchmark to compare forecast and observed telemetry.",
            status: input.benchmarkResult ? "good" : "pending",
        },
        {
            metric: "Rainfall Capture",
            value: rainfallAmount,
            remarks: input.rainfallWeather ? "Rainfall record is available for benchmark context." : "Rainfall record is pending.",
            status: input.rainfallWeather ? "ready" : "pending",
        },
    ];

    const anomalyRows: ReportTableRow[] = anomalySummary?.recent?.length
        ? anomalySummary.recent.slice(0, 5).map((row) => ({
            metric: row.title ?? "Anomaly",
            value: row.valueText ?? row.severity ?? "--",
            remarks: row.description ?? row.recommendation ?? "No anomaly description available.",
            status: row.status ?? row.severity ?? "review",
        }))
        : [{
            metric: "No Active Cases",
            value: "0",
            remarks: "No unresolved anomaly records were returned by the backend summary.",
            status: "normal",
        }];

    return {
        title: "Raincatcher Monitoring Report",
        reportType: input.reportType,
        tank: input.tank,
        dateRange: input.dateRange,
        generatedOn: input.generatedOn,
        executiveSummary,
        summaryCards: [
            { label: "Report Type", value: input.reportType, meta: "Generated export" },
            { label: "Tank Site", value: input.tank, meta: "Monitoring target" },
            { label: "Date Range", value: input.dateRange, meta: "Selected coverage" },
            { label: "Storage", value: storageLevel, meta: telemetry ? "Latest telemetry" : "Pending telemetry" },
            { label: "Forecast Accuracy", value: forecastAccuracy, meta: input.benchmarkResult ? "Benchmark result" : "Benchmark pending" },
            { label: "Anomalies", value: `${activeAnomalies} active`, meta: `${anomalySummary?.high ?? 0} high severity` },
        ],
        metricRows,
        benchmarkRows,
        anomalyRows,
        includedSections: input.selectedSections,
        recommendations: buildRecommendations(input),
    };
}

function statusColor(status: string): [number, number, number] {
    const normalized = status.toLowerCase();
    if (["normal", "good", "ready", "resolved"].includes(normalized)) return [22, 163, 74];
    if (["high", "critical"].includes(normalized)) return [220, 38, 38];
    if (["pending", "review", "medium", "investigating"].includes(normalized)) return [176, 138, 69];
    return [71, 85, 105];
}

function ensurePdfSpace(doc: jsPDF, y: number, requiredHeight: number, data: ReportTemplateData) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + requiredHeight <= pageHeight - 16) return y;

    doc.addPage();
    doc.setFillColor(176, 138, 69);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(data.title, 14, 10);
    return 24;
}

function drawPdfTable(doc: jsPDF, data: ReportTemplateData, title: string, rows: ReportTableRow[], startY: number) {
    const marginX = 14;
    const tableWidth = doc.internal.pageSize.getWidth() - marginX * 2;
    const widths = [38, 30, tableWidth - 38 - 30 - 28, 28];
    let y = ensurePdfSpace(doc, startY, 20, data);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 18, 32);
    doc.text(title, marginX, y);
    y += 6;

    doc.setFillColor(176, 138, 69);
    doc.rect(marginX, y, tableWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    ["Metric", "Value", "Remarks", "Status"].forEach((header, index) => {
        const x = marginX + widths.slice(0, index).reduce((sum, width) => sum + width, 0) + 2;
        doc.text(header, x, y + 5);
    });
    y += 8;

    rows.forEach((row, index) => {
        const metricLines = doc.splitTextToSize(row.metric, widths[0] - 4);
        const valueLines = doc.splitTextToSize(row.value, widths[1] - 4);
        const remarksLines = doc.splitTextToSize(row.remarks, widths[2] - 4);
        const rowHeight = Math.max(11, Math.max(metricLines.length, valueLines.length, remarksLines.length) * 4 + 5);
        y = ensurePdfSpace(doc, y, rowHeight + 4, data);

        doc.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 252 : 255);
        doc.rect(marginX, y, tableWidth, rowHeight, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(marginX, y, tableWidth, rowHeight);

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(metricLines, marginX + 2, y + 5);
        doc.setFont("helvetica", "normal");
        doc.text(valueLines, marginX + widths[0] + 2, y + 5);
        doc.text(remarksLines, marginX + widths[0] + widths[1] + 2, y + 5);

        const [r, g, b] = statusColor(row.status);
        doc.setTextColor(r, g, b);
        doc.setFont("helvetica", "bold");
        doc.text(doc.splitTextToSize(row.status, widths[3] - 4), marginX + widths[0] + widths[1] + widths[2] + 2, y + 5);
        y += rowHeight;
    });

    return y + 8;
}

function drawReportPdf(doc: jsPDF, data: ReportTemplateData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    let y = 0;

    doc.setFillColor(176, 138, 69);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setFillColor(143, 103, 40);
    doc.circle(pageWidth - 24, 12, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(data.title, marginX, 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${data.generatedOn}`, marginX, 23);
    doc.text(`${data.reportType} | ${data.tank}`, marginX, 29);

    y = 50;
    const cardGap = 4;
    const cardWidth = (pageWidth - marginX * 2 - cardGap * 2) / 3;
    data.summaryCards.forEach((card, index) => {
        const x = marginX + (index % 3) * (cardWidth + cardGap);
        const row = Math.floor(index / 3);
        const cardY = y + row * 22;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(219, 226, 236);
        doc.roundedRect(x, cardY, cardWidth, 17, 2, 2, "FD");
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text(card.label, x + 3, cardY + 5);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.text(doc.splitTextToSize(card.value, cardWidth - 6).slice(0, 1), x + 3, cardY + 10);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(doc.splitTextToSize(card.meta, cardWidth - 6).slice(0, 1), x + 3, cardY + 14);
    });

    y += 48;
    doc.setDrawColor(217, 190, 126);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(marginX, y, pageWidth - marginX * 2, 28, 3, 3, "FD");
    doc.setTextColor(11, 18, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Executive Summary", marginX + 4, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(data.executiveSummary, pageWidth - marginX * 2 - 8).slice(0, 4), marginX + 4, y + 15);

    y += 38;
    y = drawPdfTable(doc, data, "Monitoring Metrics", data.metricRows, y);
    y = drawPdfTable(doc, data, "Forecast and Actual Benchmark", data.benchmarkRows, y);
    y = drawPdfTable(doc, data, "Anomaly Review", data.anomalyRows, y);

    y = ensurePdfSpace(doc, y, 36, data);
    doc.setTextColor(11, 18, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Included Report Sections", marginX, y);
    y += 7;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let tagX = marginX;
    data.includedSections.forEach((section) => {
        const width = Math.min(56, doc.getTextWidth(section) + 8);
        if (tagX + width > pageWidth - marginX) {
            tagX = marginX;
            y += 9;
        }
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(217, 190, 126);
        doc.roundedRect(tagX, y - 5, width, 7, 2, 2, "FD");
        doc.setTextColor(146, 103, 32);
        doc.text(section, tagX + 4, y);
        tagX += width + 3;
    });

    y += 14;
    y = ensurePdfSpace(doc, y, 38, data);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, y, pageWidth - marginX * 2, 34, 3, 3, "FD");
    doc.setFillColor(176, 138, 69);
    doc.rect(marginX, y, 1.5, 34, "F");
    doc.setTextColor(11, 18, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Recommendation Summary", marginX + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(data.recommendations.map((item) => `- ${item}`).join(" "), pageWidth - marginX * 2 - 12).slice(0, 5), marginX + 5, y + 15);
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
    const [aiReportSummary, setAiReportSummary] = useState<AiReportSummaryResponse | null>(null);
    const [reportHistory, setReportHistory] = useState<ReportRecord[]>([]);
    const [anomalySummary, setAnomalySummary] = useState<AnomalySummary | null>(null);
    const [cameraRecords, setCameraRecords] = useState<CameraRecord[]>([]);
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

        Promise.allSettled([
            getLatestTelemetry(),
            getRainfallWeather(),
            getReportSummary(),
            getReportHistory(),
            getReportAiSummary(),
            getAnomalySummary(),
            getCameraRecordHistory(),
        ])
            .then(([telemetryResult, weatherResult, summaryResult, historyResult, aiSummaryResult, anomalyResult, cameraResult]) => {
                if (!active) return;
                if (telemetryResult.status === "fulfilled") setLatestTelemetry(telemetryResult.value);
                if (weatherResult.status === "fulfilled") setRainfallWeather(weatherResult.value);
                if (summaryResult.status === "fulfilled") setReportSummary(summaryResult.value);
                if (historyResult.status === "fulfilled") setReportHistory(historyResult.value);
                if (aiSummaryResult.status === "fulfilled") setAiReportSummary(aiSummaryResult.value);
                if (anomalyResult.status === "fulfilled") setAnomalySummary(anomalyResult.value);
                if (cameraResult.status === "fulfilled") setCameraRecords(cameraResult.value);
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

    const reportTemplateData = useMemo(() => buildReportTemplateData({
        reportType,
        tank: RAINWATER_TANK_NAME,
        dateRange,
        generatedOn,
        selectedSections,
        latestTelemetry,
        rainfallWeather,
        anomalySummary,
        benchmarkResult,
        cameraRecords,
        aiReportSummary,
    }), [
        reportType,
        dateRange,
        generatedOn,
        selectedSections,
        latestTelemetry,
        rainfallWeather,
        anomalySummary,
        benchmarkResult,
        cameraRecords,
        aiReportSummary,
    ]);

    async function generatePdfReport() {
        setPdfGenerating(true);
        setReportsActionMessage("");

        try {
            let benchmarkForPdf = benchmarkResult;
            if (!benchmarkForPdf && latestTelemetry) {
                try {
                    benchmarkForPdf = await getBenchmarkForecast({
                        observedLevelPercent: latestTelemetry.waterLevelPercent,
                    });
                    setBenchmarkResult(benchmarkForPdf);
                } catch {
                    benchmarkForPdf = null;
                }
            }

            const savedReport = await generateReport({
                reportType,
                tankId: RAINWATER_TANK_NAME,
                dateRange,
                selectedSections,
            });
            setReportHistory((prev) => [savedReport, ...prev.filter((item) => item.id !== savedReport.id)]);

            const pdfData = buildReportTemplateData({
                reportType,
                tank: RAINWATER_TANK_NAME,
                dateRange,
                generatedOn,
                selectedSections,
                latestTelemetry,
                rainfallWeather,
                anomalySummary,
                benchmarkResult: benchmarkForPdf,
                cameraRecords,
                aiReportSummary,
            });
            const doc = new jsPDF("p", "mm", "a4");
            drawReportPdf(doc, pdfData);

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
                                <section className="reports-panel reports-ai-summary-panel">
                                    <div className="reports-panel-header">
                                        <h2><Sparkles size={16} className="reports-panel-icon" /> AI Report Summary</h2>
                                    </div>

                                    {aiReportSummary ? (
                                        <div className="reports-ai-summary-content">
                                            <div className="reports-ai-summary-topline">
                                                <strong>{aiReportSummary.title}</strong>
                                                <span className={`reports-readiness-pill ${aiReportSummary.severity === "normal" ? "ready" : "pending"}`}>
                                                    {aiReportSummary.severity}
                                                </span>
                                            </div>
                                            <p>{aiReportSummary.summary}</p>
                                            <div className="reports-ai-list">
                                                {aiReportSummary.highlights.slice(0, 4).map((item) => (
                                                    <div key={item} className="reports-ai-list-row">
                                                        <CheckCircle2 size={14} />
                                                        <span>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="reports-ai-evidence">
                                                {aiReportSummary.evidence.slice(0, 4).map((item) => (
                                                    <div key={item.label}>
                                                        <span>{item.label}</span>
                                                        <strong>{item.value}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                            <small className="reports-export-note">Source: {aiReportSummary.source}</small>
                                        </div>
                                    ) : (
                                        <div className="empty-state compact">
                                            <strong>Summary pending</strong>
                                            <span>Report AI summary will load when the backend responds.</span>
                                        </div>
                                    )}
                                </section>

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
                                <h1>{reportTemplateData.title}</h1>
                                <p>{reportTemplateData.reportType} - {reportTemplateData.dateRange}</p>
                                <span>{reportTemplateData.tank}</span>
                            </div>

                            <div className="reports-pdf-section reports-pdf-section-accent">
                                <h3>Executive Summary</h3>
                                <p>{reportTemplateData.executiveSummary}</p>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Report Metrics</h3>
                                <div className="reports-pdf-metrics">
                                    {reportTemplateData.summaryCards.map((card) => (
                                        <div key={card.label}>
                                            <span>{card.label}</span>
                                            <strong>{card.value}</strong>
                                            <small>{card.meta}</small>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Monitoring Metrics</h3>
                                <div className="reports-pdf-table-preview">
                                    {reportTemplateData.metricRows.slice(0, 5).map((row) => (
                                        <div key={row.metric}>
                                            <strong>{row.metric}</strong>
                                            <span>{row.value}</span>
                                            <p>{row.remarks}</p>
                                            <em>{row.status}</em>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Forecast and Anomaly Review</h3>
                                <div className="reports-pdf-table-preview compact">
                                    {[...reportTemplateData.benchmarkRows, ...reportTemplateData.anomalyRows.slice(0, 3)].map((row) => (
                                        <div key={`${row.metric}-${row.value}`}>
                                            <strong>{row.metric}</strong>
                                            <span>{row.value}</span>
                                            <p>{row.remarks}</p>
                                            <em>{row.status}</em>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Included Sections</h3>
                                <div className="reports-pdf-tags">
                                    {reportTemplateData.includedSections.map((section) => (
                                        <span key={section}>{section}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="reports-pdf-section reports-pdf-section-accent">
                                <h3>Recommendation Summary</h3>
                                <ul className="reports-pdf-recommendations">
                                    {reportTemplateData.recommendations.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
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
