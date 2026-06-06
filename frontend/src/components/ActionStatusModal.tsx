import { CheckCircle, Loader2, X, XCircle } from "lucide-react";
import "../styles/action-status-modal.css";

export type ActionStatusState = "loading" | "success" | "error";

type Props = {
    open: boolean;
    state: ActionStatusState;
    title?: string;
    message: string;
    detail?: string;
    onClose?: () => void;
};

export default function ActionStatusModal({ open, state, title, message, detail, onClose }: Props) {
    if (!open) return null;

    const isLoading = state === "loading";
    const isSuccess = state === "success";
    const heading = title || (isLoading ? "Saving changes..." : isSuccess ? "Saved" : "Unable to save");

    return (
        <div className="action-status-backdrop" role="presentation">
            <div className={`action-status-card ${state}`} role="alertdialog" aria-live="assertive">
                {!isLoading && onClose && (
                    <button type="button" className="action-status-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                )}
                <div className="action-status-icon" aria-hidden="true">
                    {isLoading && <Loader2 size={34} className="spin" />}
                    {isSuccess && <CheckCircle size={38} />}
                    {state === "error" && <XCircle size={38} />}
                </div>
                <h2>{heading}</h2>
                <p>{message}</p>
                {detail && <small>{detail}</small>}
            </div>
        </div>
    );
}
