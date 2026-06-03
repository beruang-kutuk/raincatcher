package com.raincatcher.backend.reports;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.raincatcher.backend.anomaly.AnomalyRepository;
import com.raincatcher.backend.camera.CameraRecordRepository;
import com.raincatcher.backend.forecast.ForecastRunRepository;
import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import com.raincatcher.backend.weather.WeatherRecordEntity;
import com.raincatcher.backend.weather.WeatherRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final IotTelemetryRepository telemetryRepository;
    private final WeatherRecordRepository weatherRepository;
    private final CameraRecordRepository cameraRecordRepository;
    private final ForecastRunRepository forecastRunRepository;
    private final AnomalyRepository anomalyRepository;
    private final ObjectMapper objectMapper;

    public ReportService(
            ReportRepository reportRepository,
            IotTelemetryRepository telemetryRepository,
            WeatherRecordRepository weatherRepository,
            CameraRecordRepository cameraRecordRepository,
            ForecastRunRepository forecastRunRepository,
            AnomalyRepository anomalyRepository,
            ObjectMapper objectMapper
    ) {
        this.reportRepository = reportRepository;
        this.telemetryRepository = telemetryRepository;
        this.weatherRepository = weatherRepository;
        this.cameraRecordRepository = cameraRecordRepository;
        this.forecastRunRepository = forecastRunRepository;
        this.anomalyRepository = anomalyRepository;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> readiness() {
        Optional<IotTelemetryEntity> latestTelemetry = telemetryRepository.findTopByOrderByIdDesc();
        boolean cameraReady = cameraRecordRepository.findTopByOrderByCreatedAtDesc().isPresent();
        boolean forecastReady = forecastRunRepository.findTopByStatusOrderByCreatedAtDesc("completed").isPresent();
        boolean anomalyReady = anomalyRepository.count() > 0;
        boolean aiReady = forecastRunRepository
                .findTopByModuleAndStatusOrderByCreatedAtDesc("ai-recommendation", "completed")
                .isPresent();

        boolean telemetryReady = false;
        String telemetryDetail = "No telemetry in iot_telemetry table";
        String cameraDetail = cameraReady ? "camera_records has recent record" : "No records in camera_records";
        String forecastDetail = forecastReady ? "forecast_runs has completed run" : "No completed runs in forecast_runs";
        String anomalyDetail = anomalyReady ? "anomalies table has records" : "No records in anomalies table — no anomalies detected";
        String aiDetail = aiReady ? "ai-recommendation forecast run completed" : "No completed ai-recommendation run in forecast_runs";

        if (latestTelemetry.isPresent()) {
            long secondsAgo = Duration.between(latestTelemetry.get().getCreatedAt(), LocalDateTime.now()).toSeconds();
            if (secondsAgo < 600) {
                telemetryReady = true;
                telemetryDetail = "Latest telemetry " + secondsAgo + "s ago (id=" + latestTelemetry.get().getId() + ")";
            } else {
                telemetryDetail = "Telemetry exists but is stale (" + secondsAgo + "s ago)";
                telemetryReady = true;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("telemetry", readinessItem(telemetryReady, telemetryDetail));
        result.put("camera", readinessItem(cameraReady, cameraDetail));
        result.put("forecast", readinessItem(forecastReady, forecastDetail));
        result.put("anomaly", readinessItem(anomalyReady, anomalyDetail));
        result.put("ai", readinessItem(aiReady, aiDetail));
        result.put("allReady", telemetryReady && cameraReady && forecastReady && anomalyReady && aiReady);
        return result;
    }

    private Map<String, Object> readinessItem(boolean ready, String detail) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("status", ready ? "ready" : "pending");
        item.put("detail", detail);
        return item;
    }

    public ObjectNode summary() {
        Optional<IotTelemetryEntity> telemetry = telemetryRepository.findTopByOrderByIdDesc();
        Optional<WeatherRecordEntity> weather = weatherRepository.findTopByOrderByRecordedAtDesc();

        ObjectNode summary = objectMapper.createObjectNode();
        summary.put("generatedReportCount", reportRepository.count());
        telemetry.ifPresentOrElse((reading) -> {
            summary.put("telemetryStatus", "available");
            summary.put("telemetryId", reading.getId());
            summary.put("waterLevelPercent", reading.getWaterLevelPercent());
            summary.put("ph", reading.getPh());
            summary.put("turbidity", reading.getTurbidity());
            summary.put("telemetryCreatedAt", reading.getCreatedAt() == null ? null : reading.getCreatedAt().toString());
        }, () -> summary.put("telemetryStatus", "unavailable"));

        weather.ifPresentOrElse((record) -> {
            summary.put("weatherStatus", "available");
            summary.put("weatherRecordId", record.getId());
            summary.put("rainfallAmount", record.getRainfallAmount());
            summary.put("rainfallProbability", record.getRainfallProbability());
            summary.put("weatherCondition", record.getWeatherCondition());
            summary.put("weatherRecordedAt", record.getRecordedAt() == null ? null : record.getRecordedAt().toString());
        }, () -> summary.put("weatherStatus", "unavailable"));

        return summary;
    }

    @Transactional
    public ReportEntity generate(JsonNode request) {
        JsonNode safeRequest = request == null || request.isNull() ? objectMapper.createObjectNode() : request;
        ReportEntity report = new ReportEntity();
        report.setReportType(text(safeRequest, "reportType", "Monitoring Report"));
        report.setTankId(text(safeRequest, "tankId", "Rainwater Tank A"));
        report.setDateRange(text(safeRequest, "dateRange", ""));
        report.setStatus("generated");
        report.setSectionsJson(jsonString(safeRequest.path("selectedSections")));
        report.setSummaryJson(jsonString(summary()));
        report.setCreatedAt(LocalDateTime.now());
        return reportRepository.save(report);
    }

    public List<ReportEntity> history() {
        return reportRepository.findTop50ByOrderByCreatedAtDesc();
    }

    public ReportEntity getById(Long id) {
        return reportRepository.findById(id).orElseThrow();
    }

    private String text(JsonNode node, String fieldName, String fallback) {
        JsonNode value = node == null ? null : node.path(fieldName);
        if (value != null && value.isTextual() && !value.asText().isBlank()) return value.asText();
        return fallback;
    }

    private String jsonString(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node == null || node.isMissingNode() ? objectMapper.createObjectNode() : node);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }
}
