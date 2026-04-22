import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Lab Assistant routes */}
        <Route
          path="/lab/dashboard"
          element={
            <RequireAuth>
              <LabDashboardPage />
            </RequireAuth>
          }
        />

        {/* Placeholder pages so sidebar links work */}
        <Route
          path="/lab/telemetry"
          element={
            <RequireAuth>
              <TelemetryPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/forecast"
          element={
            <RequireAuth>
              <ForecastPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/anomalies"
          element={
            <RequireAuth>
              <AnomaliesPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/images"
          element={
            <RequireAuth>
              <TankImagesPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/simulation"
          element={
            <RequireAuth>
              <SimulationPage />
            </RequireAuth>
          }
        />

        <Route
          path="/lab/reports"
          element={
            <RequireAuth>
              <ReportsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />

        {/* Defaults */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
