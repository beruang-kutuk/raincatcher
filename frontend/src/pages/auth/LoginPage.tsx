import { useNavigate } from "react-router-dom";
import "../../styles/auth.css";
import AuthLayout from "../../components/auth/AuthLayout";
import WeeklyForecastWidget from "../../components/weather/WeeklyForecastWidget";

export default function LoginPage() {
  const nav = useNavigate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mock auth (for now)
    localStorage.setItem("rc_token", "mock-token");
    localStorage.setItem("rc_role", "LAB_ASSISTANT");

    nav("/lab/dashboard");
  }

  return (
    <AuthLayout
      left={
        <div className="auth-left">
          <div className="auth-brand">Raincatcher</div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in with your username and password.</p>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">
              Username
              <input
                className="auth-input"
                name="username"
                placeholder="e.g. labassistant01"
                autoComplete="username"
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                name="password"
                type="password"
                placeholder="••••••••"
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
              Sign in
            </button>

            <p className="auth-hint">
              Mock login: redirects to the dashboard. Backend auth comes later.
            </p>
          </form>
        </div>
      }
      right={<WeeklyForecastWidget />}
    />
  );
}
