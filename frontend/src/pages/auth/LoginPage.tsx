import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/auth.css";
import AuthLayout from "../../components/auth/AuthLayout";
import WeeklyForecastWidget from "../../components/weather/WeeklyForecastWidget";
import SessionLoadingOverlay from "../../components/layout/SessionLoadingOverlay";
import { getDashboardPath } from "../../auth/rbac";
import { loginWithBackend } from "../../services/authApi";
import raincatcherLogo from "../../assets/images/raincatcher-logo.png";

export default function LoginPage() {
  const nav = useNavigate();
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoggingIn(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    setLoginError("");

    try {
      const response = await loginWithBackend(username, password);
      localStorage.setItem("rc_token", response.token);
      localStorage.setItem("rc_role", response.role);
      const displayName = response.user?.displayName || response.user?.username || response.user?.email?.split("@")[0] || "";
      const avatarUrl = response.user?.profileImageData || response.user?.profileImageUrl || response.user?.avatarUrl || "";
      if (displayName) {
        localStorage.setItem("rc_display_name", displayName);
      }
      if (avatarUrl) {
        localStorage.setItem("rc_avatar_url", avatarUrl);
      }
      nav(getDashboardPath(response.role));
    } catch {
      setLoginError("Invalid backend username or password.");
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <AuthLayout
      left={
        <div className="auth-left">
          <div className="auth-brand">
            <img src={raincatcherLogo} alt="Raincatcher logo" className="auth-brand-logo" />
            Raincatcher
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Login with a backend account to open the matching workspace.
          </p>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">
              Username
              <input
                className="auth-input"
                name="username"
                placeholder="e.g. lab or admin"
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

            {loginError && <p className="auth-error">{loginError}</p>}

            <p className="auth-hint">
              Your workspace is determined automatically from your account role.
            </p>
          </form>
          {loggingIn && <SessionLoadingOverlay message="Logging in..." />}
        </div>
      }
      right={<WeeklyForecastWidget />}
    />
  );
}
