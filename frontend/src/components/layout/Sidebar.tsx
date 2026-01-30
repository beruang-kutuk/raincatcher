import { NavLink, useNavigate } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) =>
({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "rgba(15, 23, 42, 0.78)",
    border: isActive ? "1px solid rgba(109, 76, 255, 0.22)" : "1px solid transparent",
    background: isActive ? "rgba(109, 76, 255, 0.10)" : "transparent",
    fontWeight: isActive ? 800 : 600,
} as React.CSSProperties);

export default function Sidebar() {
    const nav = useNavigate();

    function logout() {
        localStorage.removeItem("rc_token");
        localStorage.removeItem("rc_role");
        nav("/login");
    }

    return (
        <aside
            style={{
                padding: 18,
                borderRight: "1px solid rgba(15, 23, 42, 0.08)",
                background: "white",
            }}
        >
            <div style={{ fontWeight: 900, letterSpacing: "-0.01em", marginBottom: 14 }}>
                Raincatcher
            </div>

            <div style={{ marginBottom: 14 }}>
                <input
                    placeholder="Search"
                    style={{
                        width: "100%",
                        height: 38,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        outline: "none",
                    }}
                />
            </div>

            <nav style={{ display: "grid", gap: 6 }}>
                <NavLink to="/lab/dashboard" style={linkStyle}>
                    Dashboard
                </NavLink>

                {/* placeholders for next pages */}
                <NavLink to="/lab/telemetry" style={linkStyle}>
                    Telemetry
                </NavLink>
                <NavLink to="/lab/forecast" style={linkStyle}>
                    Forecast
                </NavLink>
                <NavLink to="/lab/what-if" style={linkStyle}>
                    What-If
                </NavLink>
                <NavLink to="/lab/reports" style={linkStyle}>
                    Reports
                </NavLink>
                <NavLink to="/lab/settings" style={linkStyle}>
                    Settings
                </NavLink>
            </nav>

            <div style={{ marginTop: "auto" }} />

            <button
                onClick={logout}
                style={{
                    marginTop: 18,
                    width: "100%",
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                    color: "rgba(109, 76, 255, 0.95)",
                }}
            >
                Logout
            </button>
        </aside>
    );
}
