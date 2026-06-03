package com.raincatcher.backend.calibration;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/calibration")
public class CalibrationController {

    private final CalibrationService service;

    public CalibrationController(CalibrationService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ResponseEntity<CalibrationSummaryResponse> summary() {
        return ResponseEntity.ok(service.summary());
    }

    @GetMapping("/history")
    public ResponseEntity<List<CalibrationRecordEntity>> history() {
        return ResponseEntity.ok(service.history());
    }

    @PostMapping("/tank-storage")
    public ResponseEntity<CalibrationResponse> runTankStorage(@RequestBody(required = false) CalibrationRequest request) {
        return ResponseEntity.ok(service.runTankStorageCalibration(request));
    }

    @PostMapping("/reset")
    public ResponseEntity<CalibrationResponse> reset() {
        return ResponseEntity.ok(service.reset());
    }

    @PostMapping("/apply-baseline")
    public ResponseEntity<CalibrationResponse> applyBaseline() {
        return ResponseEntity.ok(service.applyNewBaseline());
    }
}
