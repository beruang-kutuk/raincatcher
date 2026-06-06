import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailQuestion } from "lucide-react";
import "../../styles/auth.css";
import AuthLayout from "../../components/auth/AuthLayout";
import WeeklyForecastWidget from "../../components/weather/WeeklyForecastWidget";
import ActionStatusModal, { type ActionStatusState } from "../../components/ActionStatusModal";
import { requestPasswordReset } from "../../services/authApi";
import raincatcherLogo from "../../assets/images/raincatcher-logo.png";

type ModalState = {
    open: boolean;
    state: ActionStatusState;
    message: string;
};

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [modal, setModal] = useState<ModalState>({ open: false, state: "loading", message: "" });

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setModal({ open: true, state: "loading", message: "Please wait" });
        try {
            const response = await requestPasswordReset(email);
            setModal({
                open: true,
                state: "success",
                message: response.message || "If this email exists, reset instructions have been sent.",
            });
        } catch (error) {
            setModal({
                open: true,
                state: "error",
                message: error instanceof Error ? error.message : "Unable to request password reset.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <AuthLayout
                left={
                    <div className="auth-left">
                        <div className="auth-brand">
                            <img src={raincatcherLogo} alt="Raincatcher logo" className="auth-brand-logo" />
                            Raincatcher
                        </div>
                        <div className="auth-icon-badge">
                            <MailQuestion size={24} />
                        </div>
                        <h1 className="auth-title">Forgot password?</h1>
                        <p className="auth-subtitle">No worries, we'll send you reset instructions.</p>

                        <form className="auth-form" onSubmit={onSubmit}>
                            <label className="auth-label">
                                Email
                                <input
                                    className="auth-input"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    required
                                />
                            </label>
                            <button className="auth-submit" type="submit" disabled={submitting}>
                                {submitting ? "Sending..." : "Reset password"}
                            </button>
                            <Link className="auth-link standalone" to="/login">
                                Back to login
                            </Link>
                        </form>
                    </div>
                }
                right={<WeeklyForecastWidget />}
            />
            <ActionStatusModal
                open={modal.open}
                state={modal.state}
                title={modal.state === "loading" ? "Sending instructions..." : undefined}
                message={modal.message}
                onClose={() => setModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
}
