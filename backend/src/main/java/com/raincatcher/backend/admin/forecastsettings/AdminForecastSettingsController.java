package com.raincatcher.backend.admin.forecastsettings;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/forecast-settings")
public class AdminForecastSettingsController {

    private final AdminForecastSettingsService service;

    public AdminForecastSettingsController(AdminForecastSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AdminForecastSettingsEntity>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PutMapping
    public ResponseEntity<List<AdminForecastSettingsEntity>> update(@RequestBody(required = false) AdminForecastSettingsRequest request) {
        return ResponseEntity.ok(service.update(request));
    }

    @PostMapping("/reset")
    public ResponseEntity<List<AdminForecastSettingsEntity>> reset() {
        return ResponseEntity.ok(service.reset());
    }
}
