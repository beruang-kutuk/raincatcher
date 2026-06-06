import { useEffect } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";

export type ToastState = {
    type: "loading" | "success" | "error" | "warning";
    title: string;
    message?: string;
} | null;

type Props = {
    toast: ToastState;
    onDismiss: () => void;
};

export default function StatusToast({ toast, onDismiss }: Props) {
    useEffect(() => {
        if (toast?.type === "success" || toast?.type === "warning") {
            const timer = setTimeout(onDismiss, 3500);
            return () => clearTimeout(timer);
        }
    }, [toast, onDismiss]);

    if (!toast) return null;

    return (
        <div className={`status-toast status-toast-${toast.type}`} role="alert" aria-live="assertive">
            <div className="status-toast-icon">
                {toast.type === "loading" && <Loader2 size={18} className="status-toast-spin" />}
                {toast.type === "success" && <Check size={18} />}
                {toast.type === "error" && <X size={18} />}
                {toast.type === "warning" && <AlertTriangle size={18} />}
            </div>
            <div className="status-toast-body">
                <strong>{toast.title}</strong>
                {toast.message && <span>{toast.message}</span>}
            </div>
            {toast.type !== "loading" && (
                <button className="status-toast-close" type="button" onClick={onDismiss} aria-label="Dismiss">
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
