import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import LabDashboardPage from "./pages/auth/lab/LabDashboardPage";
import RequireAuth from "./routes/RequireAuth";
import TelemetryPage from "./pages/auth/lab/TelemetryPage";
import ForecastPage from "./pages/auth/lab/ForecastPage";
import AnomaliesPage from "./pages/auth/lab/AnomaliesPage";
import TankImagesPage from "./pages/auth/lab/TankImagesPage";
import SimulationPage from "./pages/auth/lab/SimulationPage";
import ReportsPage from "./pages/auth/lab/ReportsPage";
import SettingsPage from "./pages/auth/SettingsPage";
import AdminDashboardPage from "./pages/auth/admin/AdminDashboardPage";
import SystemAdminPage from "./pages/auth/admin/SystemAdminPage";
import AccessControlPage from "./pages/auth/admin/AccessControlPage";
import {
  getDashboardPath,
  getStoredRole,
  type UserRole,
} from "./auth/rbac";
import {
  applyThemePreference,
  clearLegacyThemePreference,
  getStoredThemePreference,
} from "./theme/theme";

const labRoles: UserRole[] = ["LAB_ASSISTANT"];
const adminRoles: UserRole[] = ["SUPER_ADMIN"];
const allRoles: UserRole[] = ["LAB_ASSISTANT", "SUPER_ADMIN"];
const publicAuthRoutes = ["/login", "/signup", "/forgot-password"];

function RoleRedirect() {
  const token = localStorage.getItem("rc_token");
  const role = getStoredRole();

  if (!token || !role) return <Navigate to="/login" replace />;

  return <Navigate to={getDashboardPath(role)} replace />;
}

function ThemeRouteSync() {
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("rc_token");
    const role = getStoredRole();
    const isPublicAuthRoute = publicAuthRoutes.includes(location.pathname);

    clearLegacyThemePreference();

    if (isPublicAuthRoute || !token || !role) {
      applyThemePreference("light");
      return;
    }

    applyThemePreference(getStoredThemePreference());
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeRouteSync />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/system"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/devices"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/system-health"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/thresholds"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/forecast-settings"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/report-templates"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/diagnostics"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/audit-logs"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <SystemAdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/access"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <AccessControlPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth allowedRoles={adminRoles}>
              <Navigate to="/admin/dashboard" replace />
            </RequireAuth>
          }
        />

        <Route
          path="/lab"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <Navigate to="/lab/dashboard" replace />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/dashboard"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <LabDashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/telemetry"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <TelemetryPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/forecast"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <ForecastPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/anomalies"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <AnomaliesPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/images"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <TankImagesPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/simulation"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <SimulationPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/reports"
          element={
            <RequireAuth allowedRoles={labRoles}>
              <ReportsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth allowedRoles={allRoles}>
              <SettingsPage />
            </RequireAuth>
          }
        />

        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
