package com.raincatcher.backend.weather;

public class WeatherServiceUnavailableException extends RuntimeException {

    public WeatherServiceUnavailableException(String message) {
        super(message);
    }

    public WeatherServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
