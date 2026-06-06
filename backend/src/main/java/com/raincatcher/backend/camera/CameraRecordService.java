package com.raincatcher.backend.camera;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.raincatcher.backend.notification.NotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
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
    private final NotificationService notificationService;
    private final RestClient restClient;
    private final String rpiBaseUrl;

    public CameraRecordService(
            CameraRecordRepository repository,
            ObjectMapper objectMapper,
            NotificationService notificationService,
            @Value("${ml.service.base-url:http://192.168.100.137:5050}") String rpiBaseUrl
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
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
        record.setImageUrl(firstNonBlank(capturedImageUrl(response), getLatestFrameUrl()));

        CameraRecordEntity saved = repository.save(record);
        notificationService.createOrUpdateFromCameraRecord(saved);
        return saved;
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
        record.setImageUrl(firstNonBlank(capturedImageUrl(response), capturedImageUrl(analysis), getLatestFrameUrl()));

        CameraRecordEntity saved = repository.save(record);
        notificationService.createOrUpdateFromCameraRecord(saved);
        return saved;
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
        record.setAiRecommendation(yoloRecommendation(yolo));
        record.setFutureNote(text(yolo, "future_training_note"));
        String yoloFrameUrl = firstNonBlank(capturedImageUrl(yolo), cameraFrameProxyUrl(text(response, "yolo_frame_url")), getYoloFrameUrl());
        record.setImageUrl(yoloFrameUrl);
        record.setYoloFrameUrl(yoloFrameUrl);

        CameraRecordEntity saved = repository.save(record);
        notificationService.createOrUpdateFromYoloRecord(saved);
        return saved;
    }

    public Optional<CameraRecordEntity> getLatestRecord() {
        return repository.findTopByOrderByCreatedAtDesc().map(this::withResolvedImageUrls);
    }

    public List<CameraRecordEntity> getHistory() {
        return repository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(this::withResolvedImageUrls)
                .toList();
    }

    public Optional<CameraRecordEntity> getLatestAnalysis() {
        return repository.findTopByRecordTypeOrderByCreatedAtDesc(RECORD_TYPE_BASIC_ANALYSIS)
                .map(this::withResolvedImageUrls);
    }

    public Optional<CameraRecordEntity> getLatestYolo() {
        return repository.findTopByRecordTypeOrderByCreatedAtDesc(RECORD_TYPE_YOLO_DETECTION)
                .map(this::withResolvedImageUrls);
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

    private String getCapturedFrameUrl(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }
        String cleaned = filename.trim().replace("\\", "/");
        int slashIndex = cleaned.lastIndexOf("/");
        if (slashIndex >= 0) {
            cleaned = cleaned.substring(slashIndex + 1);
        }
        if (cleaned.isBlank()) {
            return null;
        }
        return "/api/camera-frame/captured/" + UriUtils.encodePathSegment(cleaned, StandardCharsets.UTF_8);
    }

    private String capturedImageUrl(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        String directUrl = firstTextValue(node, "image_url", "imageUrl", "frame_url", "latest_frame_url", "yolo_frame_url");
        String proxied = cameraFrameProxyUrl(directUrl);
        if (proxied != null) {
            return proxied;
        }

        String filename = firstTextValue(node, "filename", "image_filename", "saved_filename");
        String fromFilename = getCapturedFrameUrl(filename);
        if (fromFilename != null) {
            return fromFilename;
        }

        return capturedFrameUrlFromPath(firstTextValue(node, "filepath", "saved_path"));
    }

    private String cameraFrameProxyUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }

        String url = rawUrl.trim();
        if (url.startsWith("data:image/")) {
            return url;
        }
        if (url.contains("/api/camera-frame/latest") || url.contains("/api/camera/latest-frame")) {
            return getLatestFrameUrl();
        }
        if (url.contains("/api/camera-frame/yolo") || url.contains("/api/camera/yolo-frame")) {
            return getYoloFrameUrl();
        }
        if (url.contains("/api/camera/captured/")) {
            return getCapturedFrameUrl(url.substring(url.lastIndexOf("/") + 1));
        }
        if (url.contains("/captured/")) {
            return getCapturedFrameUrl(url.substring(url.lastIndexOf("/") + 1));
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            try {
                return cameraFrameProxyUrl(new URI(url).getPath());
            } catch (Exception ex) {
                return url;
            }
        }
        if (looksLikeImagePath(url)) {
            return capturedFrameUrlFromPath(url);
        }
        if (url.startsWith("/api/")) {
            return url;
        }
        return url;
    }

    private String capturedFrameUrlFromPath(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }
        String cleaned = path.trim().replace("\\", "/");
        if (!looksLikeImagePath(cleaned)) {
            return null;
        }
        return getCapturedFrameUrl(cleaned);
    }

    private boolean looksLikeImagePath(String value) {
        if (value == null) {
            return false;
        }
        String lower = value.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
    }

    private CameraRecordEntity withResolvedImageUrls(CameraRecordEntity record) {
        if (record == null) {
            return null;
        }

        String legacyCapturedUrl = legacyCapturedImageUrl(record);
        boolean yoloRecord = RECORD_TYPE_YOLO_DETECTION.equals(record.getRecordType());

        if (yoloRecord && isLiveFrameUrl(record.getImageUrl())) {
            record.setImageUrl(firstNonBlank(record.getYoloFrameUrl(), legacyCapturedUrl, getYoloFrameUrl()));
        } else if (isLiveFrameUrl(record.getImageUrl()) && legacyCapturedUrl != null) {
            record.setImageUrl(legacyCapturedUrl);
        } else if (isBlank(record.getImageUrl())) {
            record.setImageUrl(firstNonBlank(legacyCapturedUrl, getLatestFrameUrl()));
        } else {
            record.setImageUrl(firstNonBlank(cameraFrameProxyUrl(record.getImageUrl()), record.getImageUrl()));
        }

        if (yoloRecord) {
            record.setYoloFrameUrl(firstNonBlank(cameraFrameProxyUrl(record.getYoloFrameUrl()), record.getImageUrl(), getYoloFrameUrl()));
        }

        return record;
    }

    private String legacyCapturedImageUrl(CameraRecordEntity record) {
        if (record == null || record.getFutureNote() == null || record.getFutureNote().isBlank()) {
            return null;
        }
        try {
            JsonNode metadata = objectMapper.readTree(record.getFutureNote());
            return capturedImageUrl(metadata);
        } catch (Exception ex) {
            return capturedFrameUrlFromPath(record.getFutureNote());
        }
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

    private String yoloRecommendation(JsonNode yolo) {
        String label = firstDetectionLabel(yolo.path("detections"));
        String normalizedLabel = normalizeToken(label);
        Map<String, String> knownAdvice = Map.of(
                "leaf", "Remove the leaf, inspect the cover or inlet mesh, then retest turbidity.",
                "debris", "Clean visible debris and inspect the tank filter.",
                "insect", "Inspect the tank sealing and cover for gaps.",
                "trash", "Remove the object and check contamination risk.",
                "foreign_object", "Inspect immediately and log maintenance."
        );
        if (knownAdvice.containsKey(normalizedLabel)) {
            return knownAdvice.get(normalizedLabel);
        }
        Integer detectionCount = integer(yolo, "detection_count");
        if (detectionCount != null && detectionCount == 0) {
            return "No major object detected in the camera view.";
        }
        return text(yolo, "ai_recommendation");
    }

    private String firstDetectionLabel(JsonNode detections) {
        if (detections == null || !detections.isArray()) {
            return "";
        }
        for (JsonNode detection : detections) {
            String label = firstTextValue(detection, "label", "className", "class_name", "type", "object_type");
            if (label != null) {
                return label;
            }
        }
        return "";
    }

    private String firstTextValue(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            String value = text(node, fieldName);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private boolean isLiveFrameUrl(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.contains("/api/camera-frame/latest") || value.contains("/api/camera/latest-frame");
    }

    private String normalizeToken(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
