import { Navigate } from "react-router-dom";
import {
    getDashboardPath,
    getStoredRole,
    type UserRole,
} from "../auth/rbac";

type RequireAuthProps = {
    allowedRoles?: UserRole[];
    children: React.ReactNode;
};

export default function RequireAuth({ allowedRoles, children }: RequireAuthProps) {
    const token = localStorage.getItem("rc_token");
    const role = getStoredRole();

    if (!token || !role) return <Navigate to="/login" replace />;

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to={getDashboardPath(role)} replace />;
    }

    return <>{children}</>;
}
