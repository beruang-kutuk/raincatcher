type SessionLoadingOverlayProps = {
    message: string;
};

export default function SessionLoadingOverlay({ message }: SessionLoadingOverlayProps) {
    return (
        <div className="session-loading-backdrop" role="status" aria-live="polite">
            <div className="session-loading-card">
                <span className="session-loading-spinner" />
                <strong>{message}</strong>
            </div>
        </div>
    );
}

