import { useEffect, useState } from "react";
import { RPI_CAMERA_SOURCE, RPI_CAMERA_STREAM_URL } from "../../config/camera";

type RpiCameraFeedProps = {
    frameClassName: string;
    imageClassName: string;
    overlayLabel?: string;
    sourceLabel?: string;
    srcUrl?: string;
    refreshMs?: number;
};

export default function RpiCameraFeed({
    frameClassName,
    imageClassName,
    overlayLabel,
    sourceLabel = RPI_CAMERA_SOURCE,
    srcUrl = RPI_CAMERA_STREAM_URL,
    refreshMs,
}: RpiCameraFeedProps) {
    const [isStreamAvailable, setIsStreamAvailable] = useState(true);
    const [refreshToken, setRefreshToken] = useState(() => Date.now());
    const imageSrc = refreshMs
        ? `${srcUrl}${srcUrl.includes("?") ? "&" : "?"}t=${refreshToken}`
        : srcUrl;

    useEffect(() => {
        if (!refreshMs) return undefined;

        const intervalId = globalThis.setInterval(() => {
            setRefreshToken(Date.now());
        }, refreshMs);

        return () => globalThis.clearInterval(intervalId);
    }, [refreshMs, srcUrl]);

    return (
        <>
            <div
                className={`${frameClassName} camera-feed-frame ${isStreamAvailable ? "" : "camera-feed-frame-unavailable"}`}
            >
                <img
                    src={imageSrc}
                    alt="Live Raspberry Pi USB webcam feed"
                    className={`${imageClassName} ${isStreamAvailable ? "" : "camera-feed-image-hidden"}`}
                    onLoad={() => setIsStreamAvailable(true)}
                    onError={() => setIsStreamAvailable(false)}
                />

                {!isStreamAvailable && (
                    <div className="camera-feed-fallback" role="status">
                        Live camera feed unavailable. Make sure Raspberry Pi camera backend is running.
                    </div>
                )}

                {overlayLabel && isStreamAvailable && (
                    <div className="camera-feed-overlay">{overlayLabel}</div>
                )}
            </div>

            <div className="camera-status-grid">
                <div className="camera-status-item">
                    <span className="camera-status-label">Live Feed</span>
                    <strong
                        className={`camera-status-value ${isStreamAvailable ? "connected" : "unavailable"}`}
                    >
                        {isStreamAvailable ? "Connected" : "Unavailable"}
                    </strong>
                </div>

                <div className="camera-status-item">
                    <span className="camera-status-label">Source</span>
                    <strong>{sourceLabel}</strong>
                </div>

                <div className="camera-status-item camera-status-url">
                    <span className="camera-status-label">Stream URL</span>
                    <strong title={srcUrl}>{srcUrl}</strong>
                </div>
            </div>
        </>
    );
}
