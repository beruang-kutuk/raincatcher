import { useMemo, useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/reports.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    FileText,
    PieChart,
    Waves,
    CloudRain,
    CalendarDays,
    Download,
    ChevronRight,
    MoreVertical,
    BarChart3,
    Sparkles,
    Eye,
    X,
} from "lucide-react";

type SummaryCard = {
    label: string;
    value: string;
    meta: string;
    icon: React.ReactNode;
    tone: "purple" | "blue" | "green" | "violet";
};

type ReportRow = {
    id: number;
    name: string;
    type: string;
    tanks: string;
    range: string;
    generatedOn: string;
    size: string;
};

type QuickReport = {
    id: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    tone: "blue" | "red" | "orange" | "green";
};

type BenchmarkItem = {
    label: string;
    predicted: string;
    actual: string;
    deviation: string;
    status: "good" | "moderate" | "attention";
};

const summaryCards: SummaryCard[] = [
    {
        label: "Total Reports",
        value: "24",
        meta: "+4 from last 7 days",
        icon: <FileText size={22} />,
        tone: "purple",
    },
    {
        label: "Forecast Accuracy",
        value: "91%",
        meta: "Good benchmark score",
        icon: <PieChart size={22} />,
        tone: "blue",
    },
    {
        label: "Avg. Storage Level",
        value: "76%",
        meta: "+6% vs last 7 days",
        icon: <Waves size={22} />,
        tone: "green",
    },
    {
        label: "Total Rainfall",
        value: "156 mm",
        meta: "+18 mm vs last 7 days",
        icon: <CloudRain size={22} />,
        tone: "violet",
    },
];

const reportRows: ReportRow[] = [
    {
        id: 1,
        name: "Weekly Monitoring Report",
        type: "Summary",
        tanks: "All Tanks",
        range: "21 Apr 2026 - 28 Apr 2026",
        generatedOn: "28 Apr 2026, 10:30 AM",
        size: "1.2 MB",
    },
    {
        id: 2,
        name: "Performance Benchmark - Tank A",
        type: "Benchmark",
        tanks: "Tank A",
        range: "14 Apr 2026 - 20 Apr 2026",
        generatedOn: "21 Apr 2026, 09:15 AM",
        size: "980 KB",
    },
    {
        id: 3,
        name: "Monthly Report - April 2026",
        type: "Monthly",
        tanks: "All Tanks",
        range: "01 Apr 2026 - 30 Apr 2026",
        generatedOn: "01 Apr 2026, 08:45 AM",
        size: "2.4 MB",
    },
    {
        id: 4,
        name: "Anomaly Resolution Report",
        type: "Anomalies",
        tanks: "All Tanks",
        range: "21 Apr 2026 - 28 Apr 2026",
        generatedOn: "28 Apr 2026, 09:05 AM",
        size: "560 KB",
    },
    {
        id: 5,
        name: "Rainfall Capture Report",
        type: "Rainfall",
        tanks: "All Tanks",
        range: "21 Apr 2026 - 28 Apr 2026",
        generatedOn: "28 Apr 2026, 08:20 AM",
        size: "430 KB",
    },
];

const quickReports: QuickReport[] = [
    {
        id: 1,
        title: "Daily Summary",
        description: "Overview of today's tank status",
        icon: <FileText size={18} />,
        tone: "blue",
    },
    {
        id: 2,
        title: "Weekly Monitoring",
        description: "Storage, rainfall, anomaly summary",
        icon: <FileText size={18} />,
        tone: "red",
    },
    {
        id: 3,
        title: "Benchmark Report",
        description: "Forecast vs actual performance",
        icon: <BarChart3 size={18} />,
        tone: "orange",
    },
    {
        id: 4,
        title: "Custom Report",
        description: "Create a custom report",
        icon: <FileText size={18} />,
        tone: "green",
    },
];

const benchmarkItems: BenchmarkItem[] = [
    {
        label: "Storage Forecast",
        predicted: "78%",
        actual: "76%",
        deviation: "2%",
        status: "good",
    },
    {
        label: "Rainfall Capture",
        predicted: "162 mm",
        actual: "156 mm",
        deviation: "3.7%",
        status: "good",
    },
    {
        label: "Low-Water Period",
        predicted: "1 day",
        actual: "2 days",
        deviation: "1 day",
        status: "moderate",
    },
];

const reportSections = [
    "Executive Summary",
    "Rainfall",
    "Storage",
    "Forecast vs Actual",
    "Anomalies",
    "Recommendations",
];

const storageLine = [74, 79, 78, 85, 80, 73, 73, 75];
const rainfallBars = [6, 14, 22, 45, 15, 10, 6, 8];
const chartLabels = ["21 Apr", "22 Apr", "23 Apr", "24 Apr", "25 Apr", "26 Apr", "27 Apr", "28 Apr"];

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

function getBenchmarkClass(status: BenchmarkItem["status"]) {
    if (status === "attention") return "reports-benchmark-attention";
    if (status === "moderate") return "reports-benchmark-moderate";
    return "reports-benchmark-good";
}

function ReportsOverviewChart() {
    const width = 760;
    const height = 260;
    const paddingLeft = 38;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 42;

    const storageMin = 0;
    const storageMax = 100;
    const rainMax = 60;

    const linePoints = storageLine.map((value, index) => {
        const x =
            paddingLeft +
            (index * (width - paddingLeft - paddingRight)) / (storageLine.length - 1);
        const y =
            height -
            paddingBottom -
            ((value - storageMin) / (storageMax - storageMin)) *
            (height - paddingTop - paddingBottom);

        return { x, y };
    });

    const polylinePoints = linePoints.map((p) => `${p.x},${p.y}`).join(" ");
    const barWidth = 14;

    return (
        <div className="reports-chart-shell">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="reports-chart-svg"
                preserveAspectRatio="none"
            >
                {[0, 25, 50, 75, 100].map((tick) => {
                    const y =
                        height -
                        paddingBottom -
                        ((tick - storageMin) / (storageMax - storageMin)) *
                        (height - paddingTop - paddingBottom);

                    return (
                        <g key={tick}>
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={width - paddingRight}
                                y2={y}
                                className="reports-grid-line"
                            />
                            <text x={4} y={y + 4} className="reports-axis-text">
                                {tick}%
                            </text>
                        </g>
                    );
                })}

                {rainfallBars.map((value, index) => {
                    const x =
                        paddingLeft +
                        (index * (width - paddingLeft - paddingRight)) / (rainfallBars.length - 1) -
                        barWidth / 2;
                    const barHeight =
                        (value / rainMax) * (height - paddingTop - paddingBottom);
                    const y = height - paddingBottom - barHeight;

                    return (
                        <rect
                            key={index}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            className="reports-bar"
                            rx="4"
                        />
                    );
                })}

                <polyline points={polylinePoints} className="reports-line" />

                {linePoints.map((p, index) => (
                    <circle
                        key={index}
                        cx={p.x}
                        cy={p.y}
                        r="2.5"
                        className="reports-point"
                    />
                ))}
            </svg>

            <div className="reports-chart-labels">
                {chartLabels.map((label) => (
                    <span key={label}>{label}</span>
                ))}
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [reportType, setReportType] = useState("Weekly Monitoring Report");
    const [selectedTank, setSelectedTank] = useState("All Tanks");

    const selectedSections = useMemo(() => reportSections, []);

    function generatePdfReport() {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFillColor(109, 76, 255);
        doc.rect(0, 0, pageWidth, 36, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("Raincatcher Monitoring Report", 14, 16);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Rainwater Harvesting Monitoring and Benchmarking", 14, 25);

        doc.setTextColor(11, 18, 32);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Report Details", 14, 48);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Report Type: ${reportType}`, 14, 57);
        doc.text(`Tank/Site: ${selectedTank}`, 14, 64);
        doc.text("Date Range: 21 Apr 2026 - 28 Apr 2026", 14, 71);
        doc.text("Generated On: 28 Apr 2026, 10:30 AM", 14, 78);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Executive Summary", 14, 93);

        autoTable(doc, {
            startY: 99,
            head: [["Metric", "Value", "Remarks"]],
            body: [
                ["Average Storage Level", "76%", "Healthy storage level"],
                ["Total Rainfall", "156 mm", "+18 mm compared to previous period"],
                ["Forecast Accuracy", "91%", "Good benchmark score"],
                ["Anomalies Detected", "3 cases", "Requires monitoring"],
            ],
            theme: "grid",
            headStyles: {
                fillColor: [109, 76, 255],
                textColor: [255, 255, 255],
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
        });

        const firstTableEndY = (doc as any).lastAutoTable.finalY + 12;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Forecast vs Actual Benchmark", 14, firstTableEndY);

        autoTable(doc, {
            startY: firstTableEndY + 6,
            head: [["Benchmark Area", "Predicted", "Actual", "Deviation", "Status"]],
            body: benchmarkItems.map((item) => [
                item.label,
                item.predicted,
                item.actual,
                item.deviation,
                item.status,
            ]),
            theme: "grid",
            headStyles: {
                fillColor: [109, 76, 255],
                textColor: [255, 255, 255],
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
        });

        const secondTableEndY = (doc as any).lastAutoTable.finalY + 12;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Included Report Sections", 14, secondTableEndY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(selectedSections.join(", "), 14, secondTableEndY + 8, {
            maxWidth: 180,
        });

        const recommendationY = secondTableEndY + 24;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Recommendation Summary", 14, recommendationY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const recommendationText =
            "Storage performance remains healthy. Continue monitoring turbidity, inspect abnormal water level drops, and compare forecast values with observed storage behaviour to improve future benchmarking.";

        const wrappedRecommendation = doc.splitTextToSize(recommendationText, 180);
        doc.text(wrappedRecommendation, 14, recommendationY + 8);

        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        doc.text("Generated by Raincatcher Lab Panel", 14, 286);

        doc.save("raincatcher-monitoring-report.pdf");
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
                                    21 Apr 2026 - 28 Apr 2026
                                </button>

                                <button className="reports-filter-btn" type="button">
                                    All Tanks
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
                                        Compare predicted storage and rainfall values with observed mock readings
                                        to evaluate rainwater harvesting performance.
                                    </p>
                                </div>
                            </div>

                            <div className="reports-benchmark-grid">
                                {benchmarkItems.map((item) => (
                                    <div key={item.label} className="reports-benchmark-card">
                                        <div className="reports-benchmark-card-top">
                                            <h3>{item.label}</h3>
                                            <span className={getBenchmarkClass(item.status)}>{item.status}</span>
                                        </div>

                                        <div className="reports-benchmark-values">
                                            <div>
                                                <span>Predicted</span>
                                                <strong>{item.predicted}</strong>
                                            </div>
                                            <div>
                                                <span>Actual</span>
                                                <strong>{item.actual}</strong>
                                            </div>
                                            <div>
                                                <span>Deviation</span>
                                                <strong>{item.deviation}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="reports-main-grid">
                            <div className="reports-left-column">
                                <section className="reports-panel">
                                    <div className="reports-panel-header reports-panel-header-split">
                                        <h2>Storage & Rainfall Overview</h2>

                                        <button className="reports-filter-btn small" type="button">
                                            Daily
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
                                        <h2>Recent Reports</h2>
                                    </div>

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
                                                {reportRows.map((row) => (
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
                                                                    onClick={generatePdfReport}
                                                                >
                                                                    <Download size={16} />
                                                                </button>

                                                                <button type="button" className="reports-icon-btn">
                                                                    <MoreVertical size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="reports-table-footer">
                                        <p>Showing 1 to 5 of 24 results</p>

                                        <div className="reports-pagination">
                                            <button type="button" className="reports-page-btn">‹</button>
                                            <button type="button" className="reports-page-btn active">1</button>
                                            <button type="button" className="reports-page-btn">2</button>
                                            <button type="button" className="reports-page-btn">3</button>
                                            <button type="button" className="reports-page-btn">›</button>
                                        </div>
                                    </div>
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
                                            <option>Weekly Monitoring Report</option>
                                            <option>Performance Benchmark Report</option>
                                            <option>Monthly Summary Report</option>
                                            <option>Anomaly Resolution Report</option>
                                        </select>
                                    </div>

                                    <div className="reports-form-group">
                                        <label>Select Tanks</label>
                                        <select
                                            className="reports-select"
                                            value={selectedTank}
                                            onChange={(e) => setSelectedTank(e.target.value)}
                                        >
                                            <option>All Tanks</option>
                                            <option>Tank A</option>
                                            <option>Tank B</option>
                                            <option>Tank C</option>
                                            <option>Tank D</option>
                                        </select>
                                    </div>

                                    <div className="reports-form-group">
                                        <label>Date Range</label>
                                        <div className="reports-input-icon">
                                            <CalendarDays size={16} />
                                            <input
                                                type="text"
                                                value="21 Apr 2026 - 28 Apr 2026"
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
                                                    <input type="checkbox" defaultChecked />
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
                                            onClick={generatePdfReport}
                                        >
                                            <Download size={16} />
                                            <span>Generate PDF</span>
                                        </button>
                                    </div>
                                </section>

                                <section className="reports-panel">
                                    <div className="reports-panel-header">
                                        <h2>Quick Reports</h2>
                                    </div>

                                    <div className="reports-quick-list">
                                        {quickReports.map((item) => (
                                            <button key={item.id} className="reports-quick-item" type="button">
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
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {previewOpen && (
                <div className="reports-preview-backdrop">
                    <div className="reports-preview-modal">
                        <div className="reports-preview-header">
                            <div>
                                <h2>PDF Report Preview</h2>
                                <p>{reportType} · {selectedTank}</p>
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
                                <p>21 Apr 2026 - 28 Apr 2026</p>
                                <span>{selectedTank}</span>
                            </div>

                            <div className="reports-pdf-section">
                                <h3>Executive Summary</h3>
                                <div className="reports-pdf-metrics">
                                    <div>
                                        <span>Average Storage</span>
                                        <strong>76%</strong>
                                    </div>
                                    <div>
                                        <span>Total Rainfall</span>
                                        <strong>156 mm</strong>
                                    </div>
                                    <div>
                                        <span>Forecast Accuracy</span>
                                        <strong>91%</strong>
                                    </div>
                                    <div>
                                        <span>Anomalies</span>
                                        <strong>3 cases</strong>
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
                                    Storage performance remains healthy. Continue monitoring turbidity and compare
                                    forecast values with observed storage behaviour for improved benchmarking.
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
                                onClick={generatePdfReport}
                            >
                                <Download size={16} />
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}