package com.raincatcher.backend.anomaly;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/anomalies")
public class AnomalyController {

    private final AnomalyService service;

    public AnomalyController(AnomalyService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AnomalyEntity>> all() {
        return ResponseEntity.ok(service.getAnomalies());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        return ResponseEntity.ok(service.getSummary());
    }

    @PostMapping
    public ResponseEntity<AnomalyEntity> create(@RequestBody AnomalyEntity anomaly) {
        return ResponseEntity.ok(service.createManual(anomaly));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AnomalyEntity> update(@PathVariable Long id, @RequestBody AnomalyEntity anomaly) {
        return ResponseEntity.ok(service.update(id, anomaly));
    }
}
