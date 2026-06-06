import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/auth.css";
import AuthLayout from "../../components/auth/AuthLayout";
import WeeklyForecastWidget from "../../components/weather/WeeklyForecastWidget";
import SessionLoadingOverlay from "../../components/layout/SessionLoadingOverlay";
import { getDashboardPath } from "../../auth/rbac";
import { loginWithBackend, loginWithGoogle, type LoginResponse } from "../../services/authApi";
import raincatcherLogo from "../../assets/images/raincatcher-logo.png";

type LoginMethod = "password" | "google";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleButtonConfig = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  logo_alignment?: "left" | "center";
  width?: number;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";

export default function LoginPage() {
  const nav = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  const completeLogin = useCallback((response: LoginResponse) => {
    localStorage.setItem("rc_token", response.token);
    localStorage.setItem("rc_role", response.role);
    const displayName = response.user?.displayName || response.user?.username || response.user?.email?.split("@")[0] || "";
    const avatarUrl = response.user?.profileImageUrl || response.user?.avatarUrl || response.user?.profileImageData || "";
    if (displayName) {
      localStorage.setItem("rc_display_name", displayName);
    }
    if (avatarUrl) {
      localStorage.setItem("rc_avatar_url", avatarUrl);
    }
    nav(getDashboardPath(response.role));
  }, [nav]);

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    const credential = response.credential || "";
    if (!credential) {
      setLoginError("Google did not return a sign-in credential.");
      return;
    }

    setLoggingIn(true);
    setLoginError("");
    try {
      const authResponse = await loginWithGoogle(credential);
      completeLogin(authResponse);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Google login failed.");
    } finally {
      setLoggingIn(false);
    }
  }, [completeLogin]);

  useEffect(() => {
    if (loginMethod !== "google") return;

    setLoginError("");
    setGoogleReady(false);
    if (!googleClientId) {
      setLoginError("Google login is not configured. Add VITE_GOOGLE_CLIENT_ID to the frontend environment.");
      return;
    }

    let cancelled = false;

    function renderGoogleButton() {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        logo_alignment: "left",
        width: Math.min(360, googleButtonRef.current.offsetWidth || 360),
      });
      setGoogleReady(true);
    }

    function handleScriptError() {
      if (!cancelled) {
        setLoginError("Google sign-in could not be loaded. Check your connection and try again.");
      }
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (window.google) {
      renderGoogleButton();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
      existingScript.addEventListener("error", handleScriptError, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderGoogleButton, { once: true });
      script.addEventListener("error", handleScriptError, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener("load", renderGoogleButton);
      existingScript?.removeEventListener("error", handleScriptError);
    };
  }, [googleClientId, handleGoogleCredential, loginMethod]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoggingIn(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    setLoginError("");

    try {
      const response = await loginWithBackend(username, password);
      completeLogin(response);
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

          <div className="auth-method-switcher" role="tablist" aria-label="Login method">
            <button
              type="button"
              className={`auth-method ${loginMethod === "password" ? "active" : ""}`}
              onClick={() => setLoginMethod("password")}
              aria-selected={loginMethod === "password"}
            >
              Password Login
            </button>
            <button
              type="button"
              className={`auth-method ${loginMethod === "google" ? "active" : ""}`}
              onClick={() => setLoginMethod("google")}
              aria-selected={loginMethod === "google"}
            >
              Continue with Google
            </button>
          </div>

          {loginError && (
            <div className="auth-toast" role="alert" aria-live="assertive">
              <strong>Login error</strong>
              <span>{loginError}</span>
              <button type="button" onClick={() => setLoginError("")} aria-label="Dismiss login error">
                x
              </button>
            </div>
          )}

          {loginMethod === "password" ? (
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

                <Link to="/forgot-password" className="auth-link">
                  Forgot password?
                </Link>
              </div>

              <button className="auth-submit" type="submit">
                Login
              </button>

              {loginError && <p className="auth-error">{loginError}</p>}


            </form>
          ) : (
            <div className="auth-google-panel">
              <div ref={googleButtonRef} className="auth-google-button" />
              {!googleReady && !loginError && <p className="auth-hint">Loading Google sign-in...</p>}
              {loginError && <p className="auth-error">{loginError}</p>}
            </div>
          )}
          {loggingIn && <SessionLoadingOverlay message="Logging in..." />}
        </div>
      }
      right={<WeeklyForecastWidget />}
    />
  );
}
