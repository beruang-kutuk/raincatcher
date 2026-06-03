package com.raincatcher.backend.camera;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/camera-records")
public class CameraRecordController {

    private final CameraRecordService service;

    public CameraRecordController(CameraRecordService service) {
        this.service = service;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        try {
            return ResponseEntity.ok(service.checkCameraHealth());
        } catch (CameraServiceUnavailableException ex) {
            return unavailableResponse();
        }
    }

    @PostMapping("/analyse")
    public ResponseEntity<?> analyse() {
        try {
            return ResponseEntity.ok(service.runBasicAnalysis());
        } catch (CameraServiceUnavailableException ex) {
            return unavailableResponse();
        }
    }

    @PostMapping("/capture")
    public ResponseEntity<?> capture() {
        try {
            return ResponseEntity.ok(service.captureImage());
        } catch (CameraServiceUnavailableException ex) {
            return unavailableResponse();
        }
    }

    @PostMapping("/yolo-detect")
    public ResponseEntity<?> yoloDetect() {
        try {
            return ResponseEntity.ok(service.runYoloDetection());
        } catch (CameraServiceUnavailableException ex) {
            return unavailableResponse();
        }
    }

    @GetMapping("/latest")
    public ResponseEntity<CameraRecordEntity> latest() {
        return service.getLatestRecord()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    public ResponseEntity<List<CameraRecordEntity>> history() {
        return ResponseEntity.ok(service.getHistory());
    }

    @GetMapping("/latest-analysis")
    public ResponseEntity<CameraRecordEntity> latestAnalysis() {
        return service.getLatestAnalysis()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/latest-yolo")
    public ResponseEntity<CameraRecordEntity> latestYolo() {
        return service.getLatestYolo()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    private ResponseEntity<Map<String, String>> unavailableResponse() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "status", "error",
                "message", "Raspberry Pi camera service unavailable. Make sure camera_ml_backend.py is running."
        ));
    }
}
