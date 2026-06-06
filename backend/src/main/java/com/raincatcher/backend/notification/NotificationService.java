package com.raincatcher.backend.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.raincatcher.backend.anomaly.AnomalyEntity;
import com.raincatcher.backend.camera.CameraRecordEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private static final String SOURCE_ANOMALY = "anomaly";
    private static final String SOURCE_CAMERA_RECORD = "camera_record";
    private static final String SOURCE_CAMERA_YOLO = "CAMERA_YOLO";
    private static final String RECORD_TYPE_YOLO_DETECTION = "yolo_detection";
    private static final Duration TELEGRAM_COOLDOWN = Duration.ofMinutes(10);

    private final NotificationAlertRepository repository;
    private final TelegramNotificationService telegramNotificationService;
    private final ObjectMapper objectMapper;

    public NotificationService(
            NotificationAlertRepository repository,
            TelegramNotificationService telegramNotificationService,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.telegramNotificationService = telegramNotificationService;
        this.objectMapper = objectMapper;
    }

    public List<NotificationAlertEntity> latest() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    public Map<String, Long> unreadCount() {
        return Map.of("count", repository.countByReadAtIsNull());
    }

    @Transactional
    public NotificationAlertEntity markRead(Long id) {
        NotificationAlertEntity alert = repository.findById(id).orElseThrow();
        if (alert.getReadAt() == null) {
            alert.setReadAt(LocalDateTime.now());
            alert.setUpdatedAt(LocalDateTime.now());
        }
        return repository.save(alert);
    }

    @Transactional
    public Map<String, Long> markAllRead() {
        LocalDateTime now = LocalDateTime.now();
        long updated = 0L;
        for (NotificationAlertEntity alert : repository.findAll()) {
            if (alert.getReadAt() == null) {
                alert.setReadAt(now);
                alert.setUpdatedAt(now);
                repository.save(alert);
                updated++;
            }
        }
        log.info("[Notifications] Marked all as read count={}", updated);
        return Map.of("updated", updated, "count", repository.countByReadAtIsNull());
    }

    @Transactional
    public NotificationAlertEntity createOrUpdateFromAnomaly(AnomalyEntity anomaly) {
        if (anomaly == null || anomaly.getId() == null || "resolved".equalsIgnoreCase(anomaly.getStatus())) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        NotificationAlertEntity alert = repository
                .findFirstBySourceTypeAndSourceIdOrderByCreatedAtDesc(SOURCE_ANOMALY, anomaly.getId())
                .orElseGet(() -> {
                    NotificationAlertEntity created = new NotificationAlertEntity();
                    created.setSourceType(SOURCE_ANOMALY);
                    created.setSourceId(anomaly.getId());
                    created.setCreatedAt(now);
                    return created;
                });

        alert.setAlertKey(alertKey(anomaly));
        alert.setTitle(emptyToDefault(anomaly.getTitle(), "Raincatcher alert"));
        alert.setMessage(emptyToDefault(anomaly.getDescription(), emptyToDefault(anomaly.getRecommendation(), "Review the latest anomaly.")));
        alert.setSeverity(normalizeSeverity(anomaly.getSeverity()));
        alert.setLinkPath("/lab/anomalies?highlight=" + anomaly.getId());
        alert.setUpdatedAt(now);
        NotificationAlertEntity saved = repository.save(alert);

        maybeSendTelegram(saved);
        return saved;
    }

    @Transactional
    public NotificationAlertEntity createOrUpdateFromCameraRecord(CameraRecordEntity record) {
        if (record == null || record.getId() == null || !shouldAlertCameraRecord(record)) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        NotificationAlertEntity alert = repository
                .findFirstBySourceTypeAndSourceIdOrderByCreatedAtDesc(SOURCE_CAMERA_RECORD, record.getId())
                .orElseGet(() -> {
                    NotificationAlertEntity created = new NotificationAlertEntity();
                    created.setSourceType(SOURCE_CAMERA_RECORD);
                    created.setSourceId(record.getId());
                    created.setCreatedAt(now);
                    return created;
                });

        alert.setAlertKey("camera:" + emptyToDefault(record.getRecordType(), "record") + ":" + emptyToDefault(record.getVisualStatus(), record.getStatus()));
        alert.setTitle("Camera alert");
        alert.setMessage(emptyToDefault(record.getAiRecommendation(), "Review latest camera analysis."));
        alert.setSeverity(normalizeSeverity(record.getSeverity()));
        alert.setLinkPath("/lab/images");
        alert.setUpdatedAt(now);
        NotificationAlertEntity saved = repository.save(alert);

        maybeSendTelegram(saved);
        return saved;
    }

    @Transactional
    public NotificationAlertEntity createOrUpdateFromYoloRecord(CameraRecordEntity record) {
        if (record == null || record.getId() == null || !shouldAlertYoloRecord(record)) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        YoloDetectionSummary summary = yoloDetectionSummary(record);
        String objectLabel = emptyToDefault(summary.label(), "object");
        String alertKey = yoloAlertKey(objectLabel, record.getTankId());
        NotificationAlertEntity alert = repository
                .findFirstBySourceTypeAndSourceIdOrderByCreatedAtDesc(SOURCE_CAMERA_YOLO, record.getId())
                .orElseGet(() -> {
                    NotificationAlertEntity created = new NotificationAlertEntity();
                    created.setSourceType(SOURCE_CAMERA_YOLO);
                    created.setSourceId(record.getId());
                    created.setCreatedAt(now);
                    return created;
                });

        alert.setAlertKey(alertKey);
        alert.setTitle(yoloAlertTitle(objectLabel));
        alert.setMessage(yoloAlertMessage(record, summary));
        alert.setSeverity(yoloAlertSeverity(record));
        alert.setLinkPath("/lab/tank-images");
        alert.setUpdatedAt(now);
        NotificationAlertEntity saved = repository.save(alert);

        maybeSendTelegram(saved);
        return saved;
    }

    public Map<String, Object> sendTelegramTest() {
        return telegramNotificationService.sendTestMessage();
    }

    private void maybeSendTelegram(NotificationAlertEntity alert) {
        if (!isTelegramSeverity(alert.getSeverity())) {
            return;
        }
        LocalDateTime cutoff = LocalDateTime.now().minus(TELEGRAM_COOLDOWN);
        if (repository.findFirstByAlertKeyAndTelegramSentAtAfterOrderByTelegramSentAtDesc(alert.getAlertKey(), cutoff).isPresent()) {
            return;
        }
        if (telegramNotificationService.sendAlert(alert)) {
            alert.setTelegramSentAt(LocalDateTime.now());
            alert.setUpdatedAt(LocalDateTime.now());
            repository.save(alert);
        }
    }

    private boolean isTelegramSeverity(String severity) {
        return "medium".equalsIgnoreCase(severity) || "high".equalsIgnoreCase(severity);
    }

    private boolean shouldAlertCameraRecord(CameraRecordEntity record) {
        if (RECORD_TYPE_YOLO_DETECTION.equalsIgnoreCase(record.getRecordType())) {
            return shouldAlertYoloRecord(record);
        }
        return isTelegramSeverity(record.getSeverity())
                || (record.getDetectionCount() != null && record.getDetectionCount() > 0);
    }

    private boolean shouldAlertYoloRecord(CameraRecordEntity record) {
        if (!RECORD_TYPE_YOLO_DETECTION.equalsIgnoreCase(emptyToDefault(record.getRecordType(), ""))) {
            return false;
        }

        YoloDetectionSummary summary = yoloDetectionSummary(record);
        String visualStatus = normalizeToken(record.getVisualStatus());
        String status = normalizeToken(record.getStatus());
        String severity = normalizeToken(record.getSeverity());

        boolean hasDetectionCount = record.getDetectionCount() != null && record.getDetectionCount() > 0;
        boolean hasActionableClass = summary.label() != null && !isIgnoredYoloToken(summary.label());
        boolean ignoredStatusOnly = !hasDetectionCount
                && !hasActionableClass
                && (isIgnoredYoloToken(visualStatus) || visualStatus.isBlank())
                && (isIgnoredYoloToken(status) || status.isBlank())
                && !severity.equals("high")
                && !severity.equals("critical");

        if (ignoredStatusOnly) {
            return false;
        }

        return hasDetectionCount
                || hasActionableClass
                || statusIndicatesYoloAlert(visualStatus)
                || statusIndicatesYoloAlert(status)
                || severity.equals("high")
                || severity.equals("critical");
    }

    private String yoloAlertSeverity(CameraRecordEntity record) {
        String severity = normalizeToken(record.getSeverity());
        String visualStatus = normalizeToken(record.getVisualStatus());
        String status = normalizeToken(record.getStatus());
        if (severity.equals("high") || severity.equals("critical")
                || visualStatus.contains("high") || visualStatus.contains("critical")
                || status.contains("high") || status.contains("critical")) {
            return "high";
        }
        return "medium";
    }

    private String yoloAlertTitle(String objectLabel) {
        String readable = readableLabel(objectLabel);
        if (!readable.equalsIgnoreCase("object")) {
            return readable + " detected in rainwater tank";
        }
        return "YOLO visual anomaly detected";
    }

    private String yoloAlertMessage(CameraRecordEntity record, YoloDetectionSummary summary) {
        String objectLabel = readableLabel(emptyToDefault(summary.label(), "object"));
        String confidence = summary.confidence() == null ? "" : " Confidence: " + Math.round(summary.confidence() * 100) + "%.";
        String camera = emptyToDefault(record.getCameraSource(), "Raspberry Pi camera");
        String tank = emptyToDefault(record.getTankId(), "Rainwater Tank");
        String recommendation = emptyToDefault(record.getAiRecommendation(), "Review the latest YOLO annotated frame.");
        return "Object: " + objectLabel + "." + confidence
                + " Source: " + camera + " for " + tank + "."
                + " Recommendation: " + recommendation;
    }

    private String yoloAlertKey(String objectLabel, String tankId) {
        String objectKey = normalizeToken(emptyToDefault(objectLabel, "object")).toUpperCase();
        String tankKey = normalizeToken(emptyToDefault(tankId, "TANK_A")).toUpperCase();
        if (tankKey.equals("RAINWATER_TANK") || tankKey.isBlank()) {
            tankKey = "TANK_A";
        }
        return "YOLO_" + emptyToDefault(objectKey, "OBJECT") + "_" + tankKey;
    }

    private YoloDetectionSummary yoloDetectionSummary(CameraRecordEntity record) {
        if (record.getDetectionsJson() == null || record.getDetectionsJson().isBlank()) {
            return new YoloDetectionSummary(null, null);
        }
        try {
            JsonNode detections = objectMapper.readTree(record.getDetectionsJson());
            if (!detections.isArray()) {
                return new YoloDetectionSummary(null, null);
            }
            String firstLabel = null;
            Double firstConfidence = null;
            for (JsonNode detection : detections) {
                String label = firstTextValue(detection, "label", "className", "class_name", "type", "object_type");
                Double confidence = decimalValue(detection, "confidence");
                if (firstLabel == null && label != null) {
                    firstLabel = label;
                    firstConfidence = confidence;
                }
                if (label != null && !isIgnoredYoloToken(label)) {
                    return new YoloDetectionSummary(label, confidence);
                }
            }
            return new YoloDetectionSummary(firstLabel, firstConfidence);
        } catch (Exception ex) {
            return new YoloDetectionSummary(null, null);
        }
    }

    private boolean statusIndicatesYoloAlert(String value) {
        String token = normalizeToken(value);
        if (token.isBlank() || isIgnoredYoloToken(token)) {
            return false;
        }
        return token.contains("anomaly")
                || token.contains("object_detected")
                || token.contains("person_detected")
                || token.contains("detected")
                || token.contains("foreign")
                || token.contains("medium")
                || token.contains("high")
                || token.contains("critical");
    }

    private boolean isIgnoredYoloToken(String value) {
        String token = normalizeToken(value);
        return token.isBlank()
                || token.equals("no_object_detected")
                || token.equals("no_major_object_detected")
                || token.equals("no_image")
                || token.equals("model_unavailable")
                || token.equals("normal")
                || token.equals("none");
    }

    private String firstTextValue(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            if (node == null || node.path(fieldName).isMissingNode() || node.path(fieldName).isNull()) {
                continue;
            }
            String value = node.path(fieldName).asText();
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private Double decimalValue(JsonNode node, String fieldName) {
        if (node == null || node.path(fieldName).isMissingNode() || node.path(fieldName).isNull()) {
            return null;
        }
        JsonNode value = node.path(fieldName);
        if (value.isNumber()) {
            return value.asDouble();
        }
        try {
            return Double.parseDouble(value.asText());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String readableLabel(String value) {
        String token = normalizeToken(value);
        if (token.isBlank()) {
            return "object";
        }
        String[] parts = token.split("_+");
        StringBuilder readable = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) continue;
            if (readable.length() > 0) readable.append(" ");
            readable.append(part.substring(0, 1).toUpperCase()).append(part.substring(1));
        }
        return readable.length() == 0 ? "object" : readable.toString();
    }

    private String normalizeToken(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
    }

    private String alertKey(AnomalyEntity anomaly) {
        String sourceTag = emptyToDefault(anomaly.getSourceTag(), "anomaly");
        String title = emptyToDefault(anomaly.getTitle(), "alert").toLowerCase().replaceAll("[^a-z0-9]+", "-");
        return sourceTag + ":" + title;
    }

    private String normalizeSeverity(String severity) {
        if ("high".equalsIgnoreCase(severity)) return "high";
        if ("medium".equalsIgnoreCase(severity)) return "medium";
        if ("low".equalsIgnoreCase(severity)) return "low";
        return "low";
    }

    private String emptyToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record YoloDetectionSummary(String label, Double confidence) {
    }
}
