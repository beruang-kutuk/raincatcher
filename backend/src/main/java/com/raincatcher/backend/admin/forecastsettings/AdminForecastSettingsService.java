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
        seedIfMissing("tank_capacity_litres", "Tank capacity (L)", "3", "L", "input", "Prototype tank capacity is 3 L. For real deployment, replace this with the actual tank capacity.");
        seedIfMissing("daily_usage_litres", "Daily usage", "0.5", "L/day", "input", "Default estimated daily water demand for prototype.");
        seedIfMissing("catchment_area_m2", "Catchment area", "75", "m2", "input", "Roof or catchment area used for harvest estimates.");
        seedIfMissing("runoff_coefficient", "Runoff coefficient", "0.82", "", "input", "Collection efficiency used by tank forecasts.");
        seedIfMissing("forecast_days", "Forecast horizon", "7", "days", "input", "Default number of days shown in storage projections.");
        migrateOldDefault("tank_capacity_litres", "10000", "3");
        migrateOldDefault("tank_capacity_litres", "3000", "3");
        migrateOldDefault("daily_usage_litres", "250", "0.5");
        updateMetadata("tank_capacity_litres", "Tank capacity (L)", "Prototype tank capacity is 3 L. For real deployment, replace this with the actual tank capacity.", "L");
    }

    private void updateMetadata(String key, String label, String helper, String unit) {
        repository.findBySettingKey(key).ifPresent((entity) -> {
            boolean changed = false;
            if (!label.equals(entity.getLabel())) { entity.setLabel(label); changed = true; }
            if (!helper.equals(entity.getHelper())) { entity.setHelper(helper); changed = true; }
            if (!unit.equals(entity.getUnit())) { entity.setUnit(unit); changed = true; }
            if (changed) {
                entity.setUpdatedAt(LocalDateTime.now());
                repository.save(entity);
            }
        });
    }

    private void migrateOldDefault(String key, String oldValue, String newValue) {
        repository.findBySettingKey(key).ifPresent((entity) -> {
            if (oldValue.equals(entity.getValue())) {
                entity.setValue(newValue);
                entity.setUpdatedAt(LocalDateTime.now());
                repository.save(entity);
            }
        });
    }

    private void seedIfMissing(String key, String label, String value, String unit, String kind, String helper) {
        if (repository.findBySettingKey(key).isPresent()) return;
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
