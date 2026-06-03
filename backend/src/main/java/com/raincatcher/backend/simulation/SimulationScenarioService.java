package com.raincatcher.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SimulationScenarioService {

    private final SimulationScenarioRepository repository;

    public SimulationScenarioService(SimulationScenarioRepository repository) {
        this.repository = repository;
    }

    public List<SimulationScenarioEntity> getAll() {
        return repository.findTop100ByOrderByCreatedAtDesc();
    }

    @Transactional
    public SimulationScenarioEntity save(JsonNode body) {
        SimulationScenarioEntity entity = new SimulationScenarioEntity();
        entity.setScenarioName(text(body, "scenarioName", "Unnamed Scenario"));
        entity.setSourceType(text(body, "sourceType", "LOCAL"));
        entity.setTankName(text(body, "tankName", "Rainwater Tank A"));
        entity.setStartingLevelPercent(decimal(body, "startingLevelPercent"));
        entity.setFinalLevelPercent(decimal(body, "finalLevelPercent"));
        entity.setLowestLevelPercent(decimal(body, "lowestLevelPercent"));
        entity.setHighestLevelPercent(decimal(body, "highestLevelPercent"));
        entity.setRainfallMm(decimal(body, "rainfallMm"));
        entity.setDailyUsageM3(decimal(body, "dailyUsageM3"));
        entity.setTankCapacityM3(decimal(body, "tankCapacityM3"));
        entity.setCollectionEfficiencyPercent(decimal(body, "collectionEfficiencyPercent"));
        entity.setOverflowRisk(text(body, "overflowRisk", "Low"));
        entity.setShortageRisk(text(body, "shortageRisk", "Low"));
        entity.setRecommendation(text(body, "recommendation", ""));
        JsonNode projection = body.path("projectionJson");
        entity.setProjectionJson(projection.isMissingNode() || projection.isNull() ? "[]" : projection.toString());
        entity.setCreatedAt(LocalDateTime.now());
        return repository.save(entity);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private String text(JsonNode node, String field, String fallback) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return fallback;
        String text = value.asText().trim();
        return text.isEmpty() ? fallback : text;
    }

    private Double decimal(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isNumber()) return value.asDouble();
        if (value.isTextual()) {
            try { return Double.parseDouble(value.asText()); } catch (NumberFormatException ignored) {}
        }
        return null;
    }
}
