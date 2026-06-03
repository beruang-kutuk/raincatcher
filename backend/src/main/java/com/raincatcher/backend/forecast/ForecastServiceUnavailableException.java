package com.raincatcher.backend.forecast;

public class ForecastServiceUnavailableException extends RuntimeException {

    public ForecastServiceUnavailableException(Throwable cause) {
        super(cause);
    }
}
