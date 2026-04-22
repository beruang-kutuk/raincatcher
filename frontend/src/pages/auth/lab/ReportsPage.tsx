import { useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/reports.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import {
    FileText,
    PieChart,
    Waves,
    CloudRain,
    CalendarDays,
    Download,
    ChevronRight,
    MoreVertical,
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

const summaryCards: SummaryCard[] = [
    {
        label: "Total Reports",
        value: "24",
        meta: "+4 from last 7 days",
        icon: <FileText size={22} />,
        tone: "purple",
    },
    {
        label: "Data Coverage",
        value: "98%",
        meta: "Excellent",
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
        name: "Weekly Summary Report",
        type: "Summary",
        tanks: "All Tanks",
        range: "21 Apr 2026 - 28 Apr 2026",
        generatedOn: "28 Apr 2026, 10:30 AM",
        size: "1.2 MB",
    },
    {
        id: 2,
        name: "Performance Report - Tank A",
        type: "Performance",
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
        name: "Anomaly Report",
        type: "Anomalies",
        tanks: "All Tanks",
        range: "21 Apr 2026 - 28 Apr 2026",
        generatedOn: "28 Apr 2026, 09:05 AM",
        size: "560 KB",
    },
    {
        id: 5,
        name: "Rainfall Report",
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
        title: "Weekly Summary",
        description: "Last 7 days performance",
        icon: <FileText size={18} />,
        tone: "red",
    },
    {
        id: 3,
        title: "Monthly Summary",
        description: "Monthly performance overview",
        icon: <FileText size={18} />,
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

                        <div className="reports-main-grid">
                            <div className="reports-left-column">
                                <section className="reports-panel">
                                    <div className="reports-panel-header reports-panel-header-split">
                                        <h2>Storage Overview</h2>

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
                                                                <button type="button" className="reports-icon-btn">
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
                                        <select className="reports-select">
                                            <option>Summary Report</option>
                                            <option>Performance Report</option>
                                            <option>Monthly Report</option>
                                            <option>Anomaly Report</option>
                                        </select>
                                    </div>

                                    <div className="reports-form-group">
                                        <label>Select Tanks</label>
                                        <select className="reports-select">
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
                                            {["Overview", "Rainfall", "Storage", "Usage", "Anomalies"].map((item) => (
                                                <label key={item} className="reports-checkbox-item">
                                                    <input type="checkbox" defaultChecked />
                                                    <span>{item}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <button className="reports-generate-btn" type="button">
                                        <Download size={16} />
                                        <span>Generate Report</span>
                                    </button>
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
        </div>
    );
}