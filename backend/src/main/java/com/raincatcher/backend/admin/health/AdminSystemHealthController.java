package com.raincatcher.backend.admin.health;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/system-health")
public class AdminSystemHealthController {

    private final AdminSystemHealthService service;

    public AdminSystemHealthController(AdminSystemHealthService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> summary() {
        return ResponseEntity.ok(service.summary());
    }

    @PostMapping("/check")
    public ResponseEntity<List<AdminSystemHealthEntity>> check() {
        return ResponseEntity.ok(service.refresh());
    }

    @GetMapping("/services")
    public ResponseEntity<List<AdminSystemHealthEntity>> services() {
        return ResponseEntity.ok(service.services());
    }
}
