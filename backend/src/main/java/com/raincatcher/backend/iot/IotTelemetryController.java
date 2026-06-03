package com.raincatcher.backend.iot;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/iot/telemetry")
public class IotTelemetryController {

    private final IotTelemetryService service;

    public IotTelemetryController(IotTelemetryService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> receiveTelemetry(@RequestBody IotTelemetryDto reading) {
        System.out.println("[IoT] POST /api/iot/telemetry received");
        if (!isValid(reading)) {
            System.out.println("[IoT] Failed to save telemetry: invalid payload");
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Invalid telemetry payload"
            ));
        }

        System.out.println("[IoT] Payload deviceId=" + reading.getDeviceId() + ", tankId=" + reading.getTankId());

        try {
            IotTelemetryDto saved = service.save(reading);
            System.out.println("[IoT] Saved telemetry id=" + saved.getId());
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "received");
            response.put("id", saved.getId());
            response.put("message", "Telemetry saved");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception ex) {
            System.out.println("[IoT] Failed to save telemetry: " + ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Telemetry save failed"
            ));
        }
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatest() {
        IotTelemetryDto latest = service.getLatest();
        if (latest == null) {
            return ResponseEntity.ok(Map.of(
                    "status", "waiting",
                    "message", "No ESP32 telemetry received yet"
            ));
        }
        return ResponseEntity.ok(latest);
    }

    @GetMapping("/history")
    public ResponseEntity<List<IotTelemetryDto>> getHistory() {
        return ResponseEntity.ok(service.getHistory());
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(service.getStatus());
    }

    private boolean isValid(IotTelemetryDto reading) {
        return reading != null
                && hasText(reading.getDeviceId())
                && hasText(reading.getTankId())
                && Objects.nonNull(reading.getPh())
                && Objects.nonNull(reading.getTurbidity())
                && Objects.nonNull(reading.getWaterTemperature())
                && Objects.nonNull(reading.getUltrasonicDistanceCm())
                && Objects.nonNull(reading.getWaterLevelPercent());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
