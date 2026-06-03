import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
    clearSession,
    getDashboardPath,
    getStoredRole,
    type UserRole,
} from "../auth/rbac";
import SessionLoadingOverlay from "../components/layout/SessionLoadingOverlay";
import { getCurrentUser } from "../services/authApi";

type RequireAuthProps = {
    allowedRoles?: UserRole[];
    children: React.ReactNode;
};

export default function RequireAuth({ allowedRoles, children }: RequireAuthProps) {
    const token = localStorage.getItem("rc_token");
    const role = getStoredRole();
    const [sessionState, setSessionState] = useState<"checking" | "valid" | "invalid">("checking");

    useEffect(() => {
        let active = true;

        if (!token || !role) {
            setSessionState("invalid");
            return () => {
                active = false;
            };
        }

        getCurrentUser(token)
            .then((user) => {
                if (!active) return;
                localStorage.setItem("rc_role", user.role);
                const displayName = user.displayName || user.username || user.email?.split("@")[0] || "";
                const avatarUrl = user.profileImageData || user.profileImageUrl || user.avatarUrl || "";
                if (displayName) localStorage.setItem("rc_display_name", displayName);
                if (avatarUrl) localStorage.setItem("rc_avatar_url", avatarUrl);
                setSessionState("valid");
            })
            .catch(() => {
                if (!active) return;
                clearSession();
                setSessionState("invalid");
            });

        return () => {
            active = false;
        };
    }, [token, role]);

    if (sessionState === "checking") {
        return <SessionLoadingOverlay message="Checking backend session..." />;
    }

    if (!token || !role || sessionState === "invalid") {
        return <Navigate to="/login" replace />;
    }

    const verifiedRole = getStoredRole();
    if (!verifiedRole) return <Navigate to="/login" replace />;

    if (allowedRoles && !allowedRoles.includes(verifiedRole)) {
        return <Navigate to={getDashboardPath(verifiedRole)} replace />;
    }

    return <>{children}</>;
}
