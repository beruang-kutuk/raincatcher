import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    clearSession,
    getStoredRole,
    ROLE_LABELS,
} from "../../auth/rbac";
import { logoutWithBackend } from "../../services/authApi";
import SessionLoadingOverlay from "./SessionLoadingOverlay";

export default function ProfileMenu() {
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const navigate = useNavigate();
    const role = getStoredRole();
    const roleLabel = role ? ROLE_LABELS[role] : "Guest";
    const token = localStorage.getItem("rc_token") ?? "";
    const displayName = localStorage.getItem("rc_display_name") || roleLabel;
    const avatarUrl = localStorage.getItem("rc_avatar_url") || "";
    const initials = displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="profile-menu-wrapper">
            <button
                className="profile-avatar-btn"
                type="button"
                onClick={() => setOpen((prev) => !prev)}
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="User profile"
                        className="profile-avatar"
                    />
                ) : (
                    <span className="profile-avatar profile-avatar-initials">{initials}</span>
                )}
                <span className="profile-role-label">{displayName}</span>
                <span className={`profile-caret ${open ? "open" : ""}`}>
                    v
                </span>
            </button>

            {open && (
                <div className="profile-dropdown">
                    <div className="profile-dropdown-meta">
                        <strong>{displayName}</strong>
                        <span>{roleLabel}</span>
                    </div>

                    <button
                        className="profile-dropdown-item"
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            navigate("/settings");
                        }}
                    >
                        Settings
                    </button>

                    <button
                        className="profile-dropdown-item danger"
                        type="button"
                        onClick={async () => {
                            setOpen(false);
                            setLoggingOut(true);
                            try {
                                if (token) await logoutWithBackend(token);
                            } finally {
                                clearSession();
                                navigate("/login", { replace: true });
                            }
                        }}
                    >
                        Logout
                    </button>
                </div>
            )}

            {loggingOut && <SessionLoadingOverlay message="Logging out..." />}
        </div>
    );
}
