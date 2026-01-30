import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem("rc_token");
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
}
