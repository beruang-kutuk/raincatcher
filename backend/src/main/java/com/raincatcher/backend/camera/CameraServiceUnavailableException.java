package com.raincatcher.backend.camera;

public class CameraServiceUnavailableException extends RuntimeException {

    public CameraServiceUnavailableException(Throwable cause) {
        super("Raspberry Pi camera service unavailable", cause);
    }
}
