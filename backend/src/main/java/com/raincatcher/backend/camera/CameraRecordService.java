package com.raincatcher.backend.camera;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CameraRecordService {

    public static final String RECORD_TYPE_CAPTURE = "capture";
    public static final String RECORD_TYPE_BASIC_ANALYSIS = "basic_analysis";
    public static final String RECORD_TYPE_YOLO_DETECTION = "yolo_detection";

    private final CameraRecordRepository repository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String rpiBaseUrl;

    public CameraRecordService(
            CameraRecordRepository repository,
            ObjectMapper objectMapper,
            @Value("${camera.rpi.base-url}") String rpiBaseUrl
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.rpiBaseUrl = stripTrailingSlash(rpiBaseUrl);

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(4));
        requestFactory.setReadTimeout(Duration.ofSeconds(8));
        this.restClient = RestClient.builder()
                .baseUrl(this.rpiBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public Map<String, Object> checkCameraHealth() {
        JsonNode response = getJson("/api/camera/health");

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "connected");
        health.put("message", "Raspberry Pi camera service is reachable");
        health.put("baseUrl", rpiBaseUrl);
        health.put("camera", response);
        return health;
    }

    @Transactional
    public CameraRecordEntity runBasicAnalysis() {
        JsonNode response = getJson("/api/camera/analyse");

        CameraRecordEntity record = baseRecord(RECORD_TYPE_BASIC_ANALYSIS);
        record.setCameraSource(text(response, "camera_source"));
        record.setTankId(text(response, "tank"));
        record.setStatus(text(response, "status"));
        record.setSeverity(text(response, "severity"));
        applyMetrics(record, response.path("metrics"));
        record.setAiRecommendation(text(response, "ai_recommendation"));
        record.setFutureNote(text(response, "future_ml_note"));

        return repository.save(record);
    }

    @Transactional
    public CameraRecordEntity captureImage() {
        JsonNode response = getJson("/api/camera/capture");
        JsonNode analysis = response.path("analysis");

        CameraRecordEntity record = baseRecord(RECORD_TYPE_CAPTURE);
        record.setCameraSource(firstText(response, "camera_source", analysis, "camera_source"));
        record.setTankId(firstText(response, "tank", analysis, "tank"));
        record.setStatus(firstText(response, "status", analysis, "status"));
        record.setSeverity(firstText(response, "severity", analysis, "severity"));
        applyMetrics(record, analysis.path("metrics"));
        record.setAiRecommendation(firstText(response, "message", analysis, "ai_recommendation"));
        record.setFutureNote(buildCaptureMetadata(response));

        return repository.save(record);
    }

    @Transactional
    public CameraRecordEntity runYoloDetection() {
        JsonNode response = getJson("/api/camera/yolo-detect");
        JsonNode basicAnalysis = response.path("basic_analysis");
        JsonNode yolo = response.path("yolo");

        CameraRecordEntity record = baseRecord(RECORD_TYPE_YOLO_DETECTION);
        record.setCameraSource(text(response, "camera_source"));
        record.setTankId(firstText(response, "tank", yolo, "tank"));
        record.setStatus(text(basicAnalysis, "status"));
        record.setSeverity(text(yolo, "severity"));
        applyMetrics(record, basicAnalysis.path("metrics"));
        record.setVisualStatus(text(yolo, "visual_status"));
        record.setYoloModel(text(yolo, "model"));
        record.setDetectionCount(integer(yolo, "detection_count"));
        record.setDetectionsJson(jsonString(yolo.path("detections")));
        record.setAiRecommendation(text(yolo, "ai_recommendation"));
        record.setFutureNote(text(yolo, "future_training_note"));
        record.setYoloFrameUrl(getYoloFrameUrl());

        return repository.save(record);
    }

    public Optional<CameraRecordEntity> getLatestRecord() {
        return repository.findTopByOrderByCreatedAtDesc();
    }

    public List<CameraRecordEntity> getHistory() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    public Optional<CameraRecordEntity> getLatestAnalysis() {
        return repository.findTopByRecordTypeOrderByCreatedAtDesc(RECORD_TYPE_BASIC_ANALYSIS);
    }

    public Optional<CameraRecordEntity> getLatestYolo() {
        return repository.findTopByRecordTypeOrderByCreatedAtDesc(RECORD_TYPE_YOLO_DETECTION);
    }

    private CameraRecordEntity baseRecord(String recordType) {
        CameraRecordEntity record = new CameraRecordEntity();
        record.setRecordType(recordType);
        record.setImageUrl(getLatestFrameUrl());
        record.setCreatedAt(LocalDateTime.now());
        return record;
    }

    private JsonNode getJson(String path) {
        try {
            return restClient.get()
                    .uri(path)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException ex) {
            throw new CameraServiceUnavailableException(ex);
        }
    }

    private void applyMetrics(CameraRecordEntity record, JsonNode metrics) {
        if (metrics == null || metrics.isMissingNode() || metrics.isNull()) {
            return;
        }

        record.setBrightness(decimal(metrics, "brightness"));
        record.setBlurScore(decimal(metrics, "blur_score"));
        record.setDarkRatio(decimal(metrics, "dark_ratio"));
        record.setBrightRatio(decimal(metrics, "bright_ratio"));
    }

    private String buildCaptureMetadata(JsonNode response) {
        Map<String, String> metadata = new LinkedHashMap<>();
        putIfPresent(metadata, "filename", text(response, "filename"));
        putIfPresent(metadata, "filepath", text(response, "filepath"));
        putIfPresent(metadata, "saved_path", text(response, "saved_path"));
        putIfPresent(metadata, "timestamp", text(response, "timestamp"));

        if (metadata.isEmpty()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            return metadata.toString();
        }
    }

    private void putIfPresent(Map<String, String> target, String key, String value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private String getLatestFrameUrl() {
        return "/api/camera-frame/latest";
    }

    private String getYoloFrameUrl() {
        return "/api/camera-frame/yolo";
    }

    private String text(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }

        String text = value.asText();
        return text.isBlank() ? null : text;
    }

    private String firstText(JsonNode firstNode, String firstField, JsonNode secondNode, String secondField) {
        String first = text(firstNode, firstField);
        return first == null ? text(secondNode, secondField) : first;
    }

    private Double decimal(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.asDouble();
        }
        try {
            return Double.parseDouble(value.asText());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer integer(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        if (value.isInt() || value.isLong()) {
            return value.asInt();
        }
        try {
            return Integer.parseInt(value.asText());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String jsonString(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
