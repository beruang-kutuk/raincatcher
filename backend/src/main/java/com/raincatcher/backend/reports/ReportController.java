package com.raincatcher.backend.reports;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ResponseEntity<ObjectNode> summary() {
        return ResponseEntity.ok(service.summary());
    }

    @GetMapping("/readiness")
    public ResponseEntity<Map<String, Object>> readiness() {
        return ResponseEntity.ok(service.readiness());
    }

    @PostMapping("/generate")
    public ResponseEntity<ReportEntity> generate(@RequestBody(required = false) JsonNode request) {
        return ResponseEntity.ok(service.generate(request));
    }

    @GetMapping("/history")
    public ResponseEntity<List<ReportEntity>> history() {
        return ResponseEntity.ok(service.history());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportEntity> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }
}
