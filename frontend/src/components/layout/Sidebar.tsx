import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Activity,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    CloudRain,
    ClipboardList,
    Cpu,
    FileText,
    FlaskConical,
    Gauge,
    HeartPulse,
    Image,
    LayoutDashboard,
    ShieldCheck,
    SlidersHorizontal,
    Wrench,
    UserCog,
} from "lucide-react";
import { getStoredRole } from "../../auth/rbac";
import raincatcherLogo from "../../assets/images/raincatcher-logo.png";

type SidebarItem = {
    label: string;
    path: string;
    icon: React.ReactNode;
};

type SidebarProps = {
    isOpen: boolean;
    onToggle: () => void;
};

const labItems: SidebarItem[] = [
    { label: "Dashboard", path: "/lab/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Telemetry", path: "/lab/telemetry", icon: <Activity size={18} /> },
    { label: "Forecast", path: "/lab/forecast", icon: <CloudRain size={18} /> },
    { label: "Anomalies", path: "/lab/anomalies", icon: <AlertTriangle size={18} /> },
    { label: "Tank Images", path: "/lab/images", icon: <Image size={18} /> },
    { label: "Simulation", path: "/lab/simulation", icon: <FlaskConical size={18} /> },
    { label: "Reports", path: "/lab/reports", icon: <FileText size={18} /> },
];

const adminItems: SidebarItem[] = [
    { label: "Admin Dashboard", path: "/admin/dashboard", icon: <ShieldCheck size={18} /> },
    { label: "Access Control", path: "/admin/access", icon: <UserCog size={18} /> },
];

const adminSystemItems: SidebarItem[] = [
    { label: "Device Management", path: "/admin/devices", icon: <Cpu size={18} /> },
    { label: "System Health", path: "/admin/system-health", icon: <HeartPulse size={18} /> },
    { label: "Thresholds", path: "/admin/thresholds", icon: <Gauge size={18} /> },
    { label: "Forecast Settings", path: "/admin/forecast-settings", icon: <CloudRain size={18} /> },
    { label: "Report Templates", path: "/admin/report-templates", icon: <ClipboardList size={18} /> },
    { label: "Diagnostics", path: "/admin/diagnostics", icon: <Wrench size={18} /> },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: <SlidersHorizontal size={18} /> },
];

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
    const location = useLocation();
    const role = getStoredRole();
    const isAdmin = role === "SUPER_ADMIN";
    const items = isAdmin ? adminItems : labItems;
    const systemOverviewActive = isAdmin && (
        location.pathname === "/admin/system" ||
        adminSystemItems.some((item) => location.pathname === item.path)
    );
    const [systemOverviewOpen, setSystemOverviewOpen] = useState(systemOverviewActive);

    return (
        <aside className={`sidebar-fixed ${isOpen ? "expanded" : "collapsed"}`}>
            <div className="sidebar-inner">
                <div className="sidebar-top">
                    <div className="sidebar-brand-row">
                        {isOpen && (
                            <div className="sidebar-brand">
                                <div className="sidebar-brand-logo-row">
                                    <img
                                        src={raincatcherLogo}
                                        alt="Raincatcher logo"
                                        className="sidebar-logo-image"
                                    />
                                    <div>
                                        <h2>Raincatcher</h2>
                                        <p>{isAdmin ? "Super Admin" : "Lab Panel"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            className="sidebar-toggle-btn"
                            onClick={onToggle}
                            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                        >
                            {isOpen ? "<" : ">"}
                        </button>
                    </div>

                    <nav className="sidebar-nav">
                        {items.map((item) => {
                            const isActive = location.pathname === item.path;

                            return (
                                <Link
                                    key={`${item.label}-${item.path}`}
                                    to={item.path}
                                    className={`sidebar-link ${isActive ? "active" : ""}`}
                                    title={!isOpen ? item.label : undefined}
                                >
                                    <span className="sidebar-link-icon">
                                        {item.icon}
                                    </span>

                                    {isOpen && (
                                        <span className="sidebar-link-text">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}

                        {isAdmin && (
                            <div className="sidebar-group">
                                <button
                                    type="button"
                                    className={`sidebar-link sidebar-group-toggle ${systemOverviewActive ? "active" : ""}`}
                                    onClick={() => {
                                        if (!isOpen) {
                                            setSystemOverviewOpen(true);
                                            return;
                                        }
                                        setSystemOverviewOpen((prev) => !prev);
                                    }}
                                    title={!isOpen ? "System Overview" : undefined}
                                    aria-expanded={systemOverviewOpen}
                                >
                                    <span className="sidebar-link-icon">
                                        <LayoutDashboard size={18} />
                                    </span>
                                    {isOpen && (
                                        <>
                                            <span className="sidebar-link-text">System Overview</span>
                                            <span className="sidebar-group-caret">
                                                {systemOverviewOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </span>
                                        </>
                                    )}
                                </button>

                                {isOpen && systemOverviewOpen && (
                                    <div className="sidebar-subnav">
                                        <Link
                                            to="/admin/system"
                                            className={`sidebar-sublink ${location.pathname === "/admin/system" ? "active" : ""}`}
                                        >
                                            Overview
                                        </Link>
                                        {adminSystemItems.map((item) => (
                                            <Link
                                                key={`${item.label}-${item.path}`}
                                                to={item.path}
                                                className={`sidebar-sublink ${location.pathname === item.path ? "active" : ""}`}
                                            >
                                                <span className="sidebar-link-icon">{item.icon}</span>
                                                <span>{item.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>
                </div>
            </div>
        </aside>
    );
}
