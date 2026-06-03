package com.raincatcher.backend.forecast;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    private final ForecastService service;

    public ForecastController(ForecastService service) {
        this.service = service;
    }

    @PostMapping("/{module}")
    public ResponseEntity<?> runForecast(@PathVariable String module, @RequestBody(required = false) JsonNode payload) {
        try {
            return ResponseEntity.ok(service.run(module, payload));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", ex.getMessage()
            ));
        } catch (ForecastServiceUnavailableException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "status", "error",
                    "message", "Forecast service unavailable"
            ));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<ForecastRunEntity>> history() {
        return ResponseEntity.ok(service.getHistory());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ForecastRunEntity> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }
}
