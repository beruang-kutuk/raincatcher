package com.raincatcher.backend.admin.forecastsettings;

import com.raincatcher.backend.admin.audit.AdminAuditLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminForecastSettingsService {

    private final AdminForecastSettingsRepository repository;
    private final AdminAuditLogService auditLogService;

    public AdminForecastSettingsService(AdminForecastSettingsRepository repository, AdminAuditLogService auditLogService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public List<AdminForecastSettingsEntity> list() {
        seedDefaults();
        return repository.findAllByOrderByIdAsc();
    }

    @Transactional
    public List<AdminForecastSettingsEntity> update(AdminForecastSettingsRequest request) {
        seedDefaults();
        if (request != null && request.values() != null) {
            request.values().forEach((key, value) ->
                    repository.findBySettingKey(key).ifPresent((entity) -> {
                        entity.setValue(value);
                        entity.setUpdatedAt(LocalDateTime.now());
                        repository.save(entity);
                    })
            );
        }
        auditLogService.record("Forecast settings updated", "admin", "forecast-settings", "normal", "Forecast defaults saved.");
        return repository.findAllByOrderByIdAsc();
    }

    @Transactional
    public List<AdminForecastSettingsEntity> reset() {
        repository.deleteAll();
        seedDefaults();
        auditLogService.record("Forecast settings reset", "admin", "forecast-settings", "warning", "Forecast defaults reset.");
        return repository.findAllByOrderByIdAsc();
    }

    private void seedDefaults() {
        if (repository.count() > 0) return;
        seed("tank_capacity_litres", "Tank capacity", "10000", "L", "input", "Default tank capacity for forecast modules.");
        seed("daily_usage_litres", "Daily usage", "250", "L/day", "input", "Default estimated daily water demand.");
        seed("catchment_area_m2", "Catchment area", "75", "m2", "input", "Roof or catchment area used for harvest estimates.");
        seed("runoff_coefficient", "Runoff coefficient", "0.82", "", "input", "Collection efficiency used by tank forecasts.");
        seed("forecast_days", "Forecast horizon", "7", "days", "input", "Default number of days shown in storage projections.");
    }

    private void seed(String key, String label, String value, String unit, String kind, String helper) {
        AdminForecastSettingsEntity entity = new AdminForecastSettingsEntity();
        entity.setSettingKey(key);
        entity.setLabel(label);
        entity.setValue(value);
        entity.setUnit(unit);
        entity.setKind(kind);
        entity.setHelper(helper);
        entity.setUpdatedAt(LocalDateTime.now());
        repository.save(entity);
    }
}
