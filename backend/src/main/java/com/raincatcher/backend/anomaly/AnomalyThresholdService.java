package com.raincatcher.backend.anomaly;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AnomalyThresholdService {

    private final AnomalyThresholdRepository repository;

    public AnomalyThresholdService(AnomalyThresholdRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public double getThreshold(String key, double defaultValue, String unit, String description) {
        return repository.findByThresholdKey(key)
                .map(AnomalyThresholdEntity::getThresholdValue)
                .orElseGet(() -> createDefault(key, defaultValue, unit, description));
    }

    private double createDefault(String key, double defaultValue, String unit, String description) {
        AnomalyThresholdEntity threshold = new AnomalyThresholdEntity();
        threshold.setThresholdKey(key);
        threshold.setThresholdValue(defaultValue);
        threshold.setUnit(unit);
        threshold.setDescription(description);
        threshold.setUpdatedAt(LocalDateTime.now());
        repository.save(threshold);
        return defaultValue;
    }
}
