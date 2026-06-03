package com.raincatcher.backend.admin.audit;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditLogController {

    private final AdminAuditLogService service;

    public AdminAuditLogController(AdminAuditLogService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AdminAuditLogEntity>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PostMapping
    public ResponseEntity<AdminAuditLogEntity> create(@RequestBody(required = false) AdminAuditLogRequest request) {
        return ResponseEntity.ok(service.create(request));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, String>> clear() {
        service.clear();
        return ResponseEntity.ok(Map.of("status", "cleared"));
    }
}
