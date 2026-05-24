import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/auth.css";
import AuthLayout from "../../components/auth/AuthLayout";
import WeeklyForecastWidget from "../../components/weather/WeeklyForecastWidget";
import SessionLoadingOverlay from "../../components/layout/SessionLoadingOverlay";
import {
  getDashboardPath,
  ROLE_LABELS,
  type UserRole,
} from "../../auth/rbac";

const loginRoles: Array<{
  role: UserRole;
  description: string;
}> = [
  {
    role: "LAB_ASSISTANT",
    description: "Monitoring, reports, anomalies, and tank operations",
  },
  {
    role: "SYSTEM_ADMIN",
    description: "Superadmin access for users, thresholds, simulation, and rules",
  },
];

export default function LoginPage() {
  const nav = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>("LAB_ASSISTANT");
  const [loggingIn, setLoggingIn] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);

    window.setTimeout(() => {
      localStorage.setItem("rc_token", "frontend-session");
      localStorage.setItem("rc_role", selectedRole);

      nav(getDashboardPath(selectedRole));
    }, 600);
  }

  return (
    <AuthLayout
      left={
        <div className="auth-left">
          <div className="auth-brand">Raincatcher</div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Choose a role and login to the matching workspace.
          </p>

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-role-group" aria-label="Select role">
              {loginRoles.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  className={`auth-role-option ${selectedRole === item.role ? "active" : ""}`}
                  onClick={() => setSelectedRole(item.role)}
                >
                  <strong>{ROLE_LABELS[item.role]}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>

            <label className="auth-label">
              Username
              <input
                className="auth-input"
                name="username"
                placeholder={
                  selectedRole === "SYSTEM_ADMIN"
                    ? "e.g. admin01"
                    : "e.g. labassistant01"
                }
                autoComplete="username"
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                name="password"
                type="password"
                placeholder="********"
                autoComplete="current-password"
              />
            </label>

            <div className="auth-row">
              <label className="auth-remember">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <button type="button" className="auth-link">
                Forgot password?
              </button>
            </div>

            <button className="auth-submit" type="submit">
              Login
            </button>

            <p className="auth-hint">
              Frontend session routing is active. Backend auth connects later.
            </p>
          </form>
          {loggingIn && <SessionLoadingOverlay message="Logging in..." />}
        </div>
      }
      right={<WeeklyForecastWidget />}
    />
  );
}
