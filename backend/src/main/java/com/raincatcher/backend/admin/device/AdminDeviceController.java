package com.raincatcher.backend.admin.device;

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
@RequestMapping("/api/admin/devices")
public class AdminDeviceController {

    private final AdminDeviceService service;

    public AdminDeviceController(AdminDeviceService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AdminDeviceEntity>> list() {
        return ResponseEntity.ok(service.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminDeviceEntity> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    public ResponseEntity<AdminDeviceEntity> create(@RequestBody AdminDeviceRequest request) {
        return ResponseEntity.ok(service.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminDeviceEntity> update(@PathVariable Long id, @RequestBody AdminDeviceRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<AdminDeviceEntity> updateStatus(@PathVariable Long id, @RequestBody(required = false) Map<String, String> request) {
        return ResponseEntity.ok(service.updateStatus(id, request));
    }

    @PostMapping("/{id}/maintenance")
    public ResponseEntity<AdminDeviceEntity> maintenance(@PathVariable Long id, @RequestBody(required = false) Map<String, String> request) {
        return ResponseEntity.ok(service.markMaintenance(id, request));
    }

    @PostMapping("/{id}/refresh")
    public ResponseEntity<AdminDeviceEntity> refresh(@PathVariable Long id) {
        return ResponseEntity.ok(service.refresh(id));
    }

    @PostMapping("/{id}/restart-service")
    public ResponseEntity<AdminDeviceEntity> restartService(@PathVariable Long id) {
        return ResponseEntity.ok(service.restartService(id));
    }
}
