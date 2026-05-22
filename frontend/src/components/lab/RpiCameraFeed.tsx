import { useState } from "react";
import { RPI_CAMERA_SOURCE, RPI_CAMERA_STREAM_URL } from "../../config/camera";

type RpiCameraFeedProps = {
    frameClassName: string;
    imageClassName: string;
    overlayLabel?: string;
};

export default function RpiCameraFeed({
    frameClassName,
    imageClassName,
    overlayLabel,
}: RpiCameraFeedProps) {
    const [isStreamAvailable, setIsStreamAvailable] = useState(true);

    return (
        <>
            <div
                className={`${frameClassName} camera-feed-frame ${isStreamAvailable ? "" : "camera-feed-frame-unavailable"}`}
            >
                <img
                    src={RPI_CAMERA_STREAM_URL}
                    alt="Live Raspberry Pi USB webcam feed"
                    className={`${imageClassName} ${isStreamAvailable ? "" : "camera-feed-image-hidden"}`}
                    onLoad={() => setIsStreamAvailable(true)}
                    onError={() => setIsStreamAvailable(false)}
                />

                {!isStreamAvailable && (
                    <div className="camera-feed-fallback" role="status">
                        Camera feed unavailable. Check Raspberry Pi connection.
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
                    <strong>{RPI_CAMERA_SOURCE}</strong>
                </div>

                <div className="camera-status-item camera-status-url">
                    <span className="camera-status-label">Stream URL</span>
                    <strong title={RPI_CAMERA_STREAM_URL}>{RPI_CAMERA_STREAM_URL}</strong>
                </div>
            </div>
        </>
    );
}
