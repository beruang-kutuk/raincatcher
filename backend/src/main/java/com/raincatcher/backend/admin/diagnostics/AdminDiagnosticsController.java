package com.raincatcher.backend.admin.diagnostics;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/diagnostics")
public class AdminDiagnosticsController {

    private final AdminDiagnosticsService service;

    public AdminDiagnosticsController(AdminDiagnosticsService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AdminDiagnosticEntity>> latest() {
        return ResponseEntity.ok(service.latest());
    }

    @PostMapping("/run")
    public ResponseEntity<List<AdminDiagnosticEntity>> run(@RequestBody(required = false) AdminDiagnosticRequest request) {
        return ResponseEntity.ok(service.run(request));
    }

    @GetMapping("/history")
    public ResponseEntity<List<AdminDiagnosticEntity>> history() {
        return ResponseEntity.ok(service.latest());
    }
}
