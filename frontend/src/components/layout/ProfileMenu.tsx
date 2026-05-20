import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    clearSession,
    getStoredRole,
    ROLE_LABELS,
} from "../../auth/rbac";

export default function ProfileMenu() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const role = getStoredRole();
    const roleLabel = role ? ROLE_LABELS[role] : "Guest";

    return (
        <div className="profile-menu-wrapper">
            <button
                className="profile-avatar-btn"
                type="button"
                onClick={() => setOpen((prev) => !prev)}
            >
                <img
                    src="https://i.pravatar.cc/100?img=12"
                    alt="User profile"
                    className="profile-avatar"
                />
                <span className="profile-role-label">{roleLabel}</span>
                <span className={`profile-caret ${open ? "open" : ""}`}>
                    v
                </span>
            </button>

            {open && (
                <div className="profile-dropdown">
                    <div className="profile-dropdown-meta">
                        <strong>{roleLabel}</strong>
                        <span>Mock session</span>
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
                        onClick={() => {
                            setOpen(false);
                            clearSession();
                            navigate("/login", { replace: true });
                        }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
