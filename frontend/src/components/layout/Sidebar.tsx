import { Link, useLocation } from "react-router-dom";

type SidebarItem = {
    label: string;
    path: string;
};

const labItems: SidebarItem[] = [
    { label: "Dashboard", path: "/lab/dashboard" },
    { label: "Telemetry", path: "/lab/telemetry" },
    { label: "Forecast", path: "/lab/forecast" },
    { label: "Anomalies", path: "/lab/anomalies" },
    { label: "Tank Images", path: "/lab/images" },
    { label: "Simulation", path: "/lab/simulation" },
    { label: "Reports", path: "/lab/reports" },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <aside className="sidebar">
            <div>
                <div className="sidebar-brand">
                    <h2>Raincatcher</h2>
                    <p>Lab Panel</p>
                </div>

                <nav className="sidebar-nav">
                    {labItems.map((item) => {
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`sidebar-link ${isActive ? "active" : ""}`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}