package com.raincatcher.backend.weather;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService service;

    public WeatherController(WeatherService service) {
        this.service = service;
    }

    @GetMapping("/current")
    public ResponseEntity<?> current() {
        return weatherResponse(service::getCurrent);
    }

    @GetMapping("/forecast/daily")
    public ResponseEntity<?> daily() {
        return weatherResponse(service::getDailyForecast);
    }

    @GetMapping("/forecast/hourly")
    public ResponseEntity<?> hourly() {
        return weatherResponse(service::getHourlyForecast);
    }

    @GetMapping("/rainfall")
    public ResponseEntity<?> rainfall() {
        return weatherResponse(service::getRainfall);
    }

    @GetMapping("/history")
    public ResponseEntity<List<WeatherRecordEntity>> history() {
        return ResponseEntity.ok(service.getHistory());
    }

    @GetMapping("/forecast/daily/multi")
    public ResponseEntity<?> dailyMulti() {
        try {
            return ResponseEntity.ok(service.getMultiDayForecast());
        } catch (WeatherServiceUnavailableException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "status", "error",
                    "message", ex.getMessage() != null && ex.getMessage().contains("API key")
                            ? "AccuWeather API key is not configured on the backend. Set ACCUWEATHER_API_KEY on the Raspberry Pi."
                            : "Weather service unavailable"
            ));
        }
    }

    private ResponseEntity<?> weatherResponse(WeatherSupplier supplier) {
        try {
            return ResponseEntity.ok(supplier.get());
        } catch (WeatherServiceUnavailableException ex) {
            String msg = ex.getMessage();
            String userMsg = (msg != null && msg.contains("API key"))
                    ? "AccuWeather API key is not configured. Set ACCUWEATHER_API_KEY on the Raspberry Pi backend."
                    : "Weather service unavailable: " + (msg != null ? msg : "unknown error");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "status", "error",
                    "message", userMsg
            ));
        }
    }

    private interface WeatherSupplier {
        WeatherRecordEntity get();
    }
}
