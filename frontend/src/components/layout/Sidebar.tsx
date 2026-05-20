import { Link, useLocation } from "react-router-dom";
import {
    Activity,
    AlertTriangle,
    CloudRain,
    FileText,
    FlaskConical,
    Image,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    UserCog,
} from "lucide-react";
import { getStoredRole } from "../../auth/rbac";

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
    { label: "System Admin", path: "/admin/system", icon: <SlidersHorizontal size={18} /> },
    { label: "Access Control", path: "/admin/access", icon: <UserCog size={18} /> },
    { label: "Settings", path: "/settings", icon: <Settings size={18} /> },
];

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
    const location = useLocation();
    const role = getStoredRole();
    const isAdmin = role === "SYSTEM_ADMIN";
    const items = isAdmin ? adminItems : labItems;

    return (
        <aside className={`sidebar-fixed ${isOpen ? "expanded" : "collapsed"}`}>
            <div className="sidebar-inner">
                <div className="sidebar-top">
                    <div className="sidebar-brand-row">
                        {isOpen && (
                            <div className="sidebar-brand">
                                <h2>Raincatcher</h2>
                                <p>{isAdmin ? "Super Admin" : "Lab Panel"}</p>
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
                    </nav>
                </div>
            </div>
        </aside>
    );
}
