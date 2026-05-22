const DEFAULT_RPI_CAMERA_STREAM_URL = "http://192.168.100.204:5000/video-feed";

export const RPI_CAMERA_STREAM_URL =
    import.meta.env.VITE_RPI_CAMERA_STREAM_URL?.trim() || DEFAULT_RPI_CAMERA_STREAM_URL;

export const RPI_CAMERA_SOURCE = "Raspberry Pi 5 USB Webcam";
