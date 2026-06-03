package com.raincatcher.backend.admin.threshold;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/thresholds")
public class AdminThresholdController {

    private final AdminThresholdService service;

    public AdminThresholdController(AdminThresholdService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AdminThresholdEntity>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PutMapping
    public ResponseEntity<List<AdminThresholdEntity>> update(@RequestBody(required = false) AdminThresholdRequest request) {
        return ResponseEntity.ok(service.update(request));
    }

    @PostMapping("/reset")
    public ResponseEntity<List<AdminThresholdEntity>> reset() {
        return ResponseEntity.ok(service.reset());
    }
}
