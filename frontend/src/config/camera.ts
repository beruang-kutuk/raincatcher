import { buildBackendUrl } from "../services/apiConfig";

const DEFAULT_RPI_CAMERA_STREAM_URL = buildBackendUrl("/api/camera-frame/latest");

export const RPI_CAMERA_STREAM_URL = DEFAULT_RPI_CAMERA_STREAM_URL;

export const RPI_CAMERA_SOURCE = "Raspberry Pi 5 USB Webcam";
