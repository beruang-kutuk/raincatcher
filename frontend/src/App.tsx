import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import LabDashboardPage from "./pages/auth/lab/LabDashboardPage";
import RequireAuth from "./routes/RequireAuth";

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
              <div style={{ padding: 24 }}>Telemetry (coming next)</div>
            </RequireAuth>
          }
        />

        <Route
          path="/lab/forecast"
          element={
            <RequireAuth>
              <div style={{ padding: 24 }}>Forecast (coming next)</div>
            </RequireAuth>
          }
        />

        <Route
          path="/lab/what-if"
          element={
            <RequireAuth>
              <div style={{ padding: 24 }}>What-if Simulation (coming next)</div>
            </RequireAuth>
          }
        />

        <Route
          path="/lab/reports"
          element={
            <RequireAuth>
              <div style={{ padding: 24 }}>Reports (coming next)</div>
            </RequireAuth>
          }
        />

        <Route
          path="/lab/settings"
          element={
            <RequireAuth>
              <div style={{ padding: 24 }}>Settings (coming next)</div>
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
