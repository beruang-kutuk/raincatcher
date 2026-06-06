import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import "../../styles/auth.css";
import AuthLayout from "../../components/auth/AuthLayout";
import WeeklyForecastWidget from "../../components/weather/WeeklyForecastWidget";
import ActionStatusModal, { type ActionStatusState } from "../../components/ActionStatusModal";
import { resetPassword } from "../../services/authApi";
import raincatcherLogo from "../../assets/images/raincatcher-logo.png";

type ModalState = {
    open: boolean;
    state: ActionStatusState;
    message: string;
};

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [modal, setModal] = useState<ModalState>({ open: false, state: "loading", message: "" });

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        if (!token) {
            setModal({ open: true, state: "error", message: "Reset token is missing." });
            return;
        }
        if (newPassword !== confirmPassword) {
            setModal({ open: true, state: "error", message: "Passwords do not match." });
            return;
        }

        setSubmitting(true);
        setModal({ open: true, state: "loading", message: "Please wait" });
        try {
            const response = await resetPassword(token, newPassword);
            setModal({ open: true, state: "success", message: response.message || "Password reset successfully." });
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            setModal({
                open: true,
                state: "error",
                message: error instanceof Error ? error.message : "Unable to reset password.",
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
                            <KeyRound size={24} />
                        </div>
                        <h1 className="auth-title">Reset password</h1>
                        <p className="auth-subtitle">Choose a new password for your Raincatcher account.</p>

                        <form className="auth-form" onSubmit={onSubmit}>
                            <label className="auth-label">
                                New password
                                <input
                                    className="auth-input"
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                    required
                                />
                            </label>
                            <label className="auth-label">
                                Confirm password
                                <input
                                    className="auth-input"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Repeat new password"
                                    autoComplete="new-password"
                                    required
                                />
                            </label>
                            <button className="auth-submit" type="submit" disabled={submitting || !token}>
                                {submitting ? "Resetting..." : "Reset password"}
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
                title={modal.state === "loading" ? "Resetting password..." : undefined}
                message={modal.message}
                detail={modal.state === "success" ? "You can now return to login." : undefined}
                onClose={() => setModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
}
