package com.raincatcher.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.raincatcher.backend.anomaly.AnomalyEntity;
import com.raincatcher.backend.anomaly.AnomalyRepository;
import com.raincatcher.backend.anomaly.AnomalyThresholdService;
import com.raincatcher.backend.calibration.CalibrationRecordEntity;
import com.raincatcher.backend.calibration.CalibrationRecordRepository;
import com.raincatcher.backend.calibration.CalibrationService;
import com.raincatcher.backend.camera.CameraRecordEntity;
import com.raincatcher.backend.camera.CameraRecordRepository;
import com.raincatcher.backend.camera.CameraRecordService;
import com.raincatcher.backend.forecast.ForecastRunEntity;
import com.raincatcher.backend.forecast.ForecastRunRepository;
import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import com.raincatcher.backend.notification.NotificationAlertEntity;
import com.raincatcher.backend.notification.NotificationAlertRepository;
import com.raincatcher.backend.weather.WeatherRecordEntity;
import com.raincatcher.backend.weather.WeatherRecordRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AiWaterAdvisorService {

    private static final List<String> HUMAN_DECISION_OPTIONS = List.of(
            "Mark as inspected",
            "Cleaned tank",
            "Escalate",
            "Ignore"
    );

    private final IotTelemetryRepository telemetryRepository;
    private final ForecastRunRepository forecastRunRepository;
    private final WeatherRecordRepository weatherRecordRepository;
    private final AnomalyRepository anomalyRepository;
    private final CameraRecordRepository cameraRecordRepository;
    private final CalibrationRecordRepository calibrationRecordRepository;
    private final NotificationAlertRepository notificationAlertRepository;
    private final AiAdvisorActionRepository actionRepository;
    private final AnomalyThresholdService thresholdService;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final boolean openAiEnabled;
    private final String openAiApiKey;
    private final String openAiModel;
    private final String responsesUrl;

    public AiWaterAdvisorService(
            IotTelemetryRepository telemetryRepository,
            ForecastRunRepository forecastRunRepository,
            WeatherRecordRepository weatherRecordRepository,
            AnomalyRepository anomalyRepository,
            CameraRecordRepository cameraRecordRepository,
            CalibrationRecordRepository calibrationRecordRepository,
            NotificationAlertRepository notificationAlertRepository,
            AiAdvisorActionRepository actionRepository,
            AnomalyThresholdService thresholdService,
            ObjectMapper objectMapper,
            @Value("${openai.enabled:false}") boolean openAiEnabled,
            @Value("${openai.api.key:}") String openAiApiKey,
            @Value("${openai.model:gpt-4.1-mini}") String openAiModel,
            @Value("${openai.responses.url:https://api.openai.com/v1/responses}") String responsesUrl
    ) {
        this.telemetryRepository = telemetryRepository;
        this.forecastRunRepository = forecastRunRepository;
        this.weatherRecordRepository = weatherRecordRepository;
        this.anomalyRepository = anomalyRepository;
        this.cameraRecordRepository = cameraRecordRepository;
        this.calibrationRecordRepository = calibrationRecordRepository;
        this.notificationAlertRepository = notificationAlertRepository;
        this.actionRepository = actionRepository;
        this.thresholdService = thresholdService;
        this.objectMapper = objectMapper;
        this.openAiEnabled = openAiEnabled;
        this.openAiApiKey = openAiApiKey == null ? "" : openAiApiKey.trim();
        this.openAiModel = openAiModel == null || openAiModel.isBlank() ? "gpt-4.1-mini" : openAiModel.trim();
        this.responsesUrl = responsesUrl == null || responsesUrl.isBlank()
                ? "https://api.openai.com/v1/responses"
                : responsesUrl.trim();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(8));
        requestFactory.setReadTimeout(Duration.ofSeconds(24));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    @Transactional
    public AiAdvisorResponse waterAdvisor() {
        AdvisorSnapshot snapshot = snapshot();
        AiAdvisorResponse fallback = fallbackAdvisor(snapshot);

        Optional<JsonNode> gpt = callOpenAiJson(
                "raincatcher_water_advisor",
                advisorSchema(),
                "You are Raincatcher's water safety advisor. Use the supplied sensor, forecast, anomaly, YOLO, threshold, and calibration evidence. Return concise JSON only. If YOLO labels mention leaf, debris, trash, insect, or foreign_object, include specific cleaning and inspection advice. Do not invent evidence values.",
                snapshot.context()
        );

        return gpt
                .map((node) -> advisorFromGpt(node, snapshot.evidence(), fallback))
                .orElse(fallback);
    }

    @Transactional
    public AiAdvisorActionEntity recordAction(AiAdvisorActionRequest request) {
        String action = request == null ? "" : trim(request.action());
        if (!HUMAN_DECISION_OPTIONS.contains(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported water advisor action.");
        }

        AiAdvisorActionEntity entity = new AiAdvisorActionEntity();
        entity.setAction(action);
        entity.setNote(trimToNull(request.note()));
        entity.setUserName(emptyToDefault(trimToNull(request.user()), "unknown"));
        entity.setCreatedAt(LocalDateTime.now());
        return actionRepository.save(entity);
    }

    @Transactional
    public AiReportSummaryResponse reportSummary() {
        AdvisorSnapshot snapshot = snapshot();
        AiReportSummaryResponse fallback = fallbackReportSummary(snapshot);

        Optional<JsonNode> gpt = callOpenAiJson(
                "raincatcher_report_summary",
                reportSchema(),
                "Summarize Raincatcher's recent monitoring state for a report. Cover telemetry, persisted alerts, forecast reliability, anomalies, YOLO/camera findings, and maintenance actions. Return concise JSON only.",
                snapshot.context()
        );

        return gpt
                .map((node) -> reportFromGpt(node, snapshot.evidence(), fallback))
                .orElse(fallback);
    }

    private AdvisorSnapshot snapshot() {
        IotTelemetryEntity telemetry = telemetryRepository.findTopByOrderByIdDesc().orElse(null);
        ForecastRunEntity forecast = forecastRunRepository.findTopByStatusOrderByCreatedAtDesc("completed").orElse(null);
        WeatherRecordEntity weather = weatherRecordRepository.findTopByOrderByRecordedAtDesc().orElse(null);
        AnomalyEntity anomaly = anomalyRepository.findTop100ByStatusNotOrderByCreatedAtDesc("resolved").stream().findFirst().orElse(null);
        CameraRecordEntity yolo = cameraRecordRepository
                .findTopByRecordTypeOrderByCreatedAtDesc(CameraRecordService.RECORD_TYPE_YOLO_DETECTION)
                .orElse(null);
        CalibrationRecordEntity calibration = calibrationRecordRepository
                .findTopByModuleOrderByCreatedAtDesc(CalibrationService.TANK_STORAGE_MODULE)
                .orElse(null);

        Map<String, Double> thresholds = thresholds();
        List<AiEvidenceItem> evidence = evidence(telemetry, weather, yolo, calibration, thresholds);

        ObjectNode context = objectMapper.createObjectNode();
        context.set("latestTelemetry", valueNode(telemetry));
        context.set("latestCompletedForecast", valueNode(forecast));
        context.set("latestWeatherOrRainfall", valueNode(weather));
        context.set("latestUnresolvedAnomaly", valueNode(anomaly));
        context.set("latestYoloResult", valueNode(yolo));
        context.set("thresholds", valueNode(thresholds));
        context.set("calibrationStatus", valueNode(calibrationSummary(calibration)));
        context.set("evidence", valueNode(evidence));
        context.set("recentAlerts", valueNode(notificationAlertRepository.findTop50ByOrderByCreatedAtDesc().stream().limit(12).toList()));
        context.set("recentMaintenanceActions", valueNode(actionRepository.findTop20ByOrderByCreatedAtDesc()));

        return new AdvisorSnapshot(telemetry, weather, anomaly, yolo, calibration, thresholds, evidence, context);
    }

    private AiAdvisorResponse fallbackAdvisor(AdvisorSnapshot snapshot) {
        List<String> actions = fallbackActions(snapshot);
        String severity = fallbackSeverity(snapshot);
        String title = switch (severity) {
            case "high" -> "Immediate tank inspection recommended";
            case "medium" -> "Water quality needs review";
            case "low" -> "Minor monitoring attention";
            default -> "Water system operating normally";
        };

        String summary = switch (severity) {
            case "high" -> "One or more critical readings or high-severity anomalies require human inspection before routine use.";
            case "medium" -> "Sensor, forecast, camera, or calibration evidence shows conditions worth checking during the next maintenance window.";
            case "low" -> "The system is mostly stable, with one low-risk item to keep an eye on.";
            default -> "Latest telemetry and available evidence are within expected operating ranges.";
        };

        return new AiAdvisorResponse(
                severity,
                title,
                summary,
                snapshot.evidence(),
                actions,
                HUMAN_DECISION_OPTIONS,
                "fallback",
                LocalDateTime.now()
        );
    }

    private AiReportSummaryResponse fallbackReportSummary(AdvisorSnapshot snapshot) {
        long alertCount = notificationAlertRepository.count();
        long unreadCount = notificationAlertRepository.countByReadAtIsNull();
        List<AiAdvisorActionEntity> actions = actionRepository.findTop20ByOrderByCreatedAtDesc();
        String severity = fallbackSeverity(snapshot);

        List<String> highlights = new ArrayList<>();
        highlights.add(snapshot.telemetry() == null
                ? "No telemetry readings are available yet."
                : "Latest telemetry is available for pH, turbidity, and tank level.");
        highlights.add(alertCount + " notification alert(s) recorded; " + unreadCount + " unread.");
        highlights.add(snapshot.calibration() == null
                ? "Forecast reliability is pending calibration."
                : "Latest calibration accuracy is " + formatPercent(snapshot.calibration().getAccuracyPercent()) + ".");
        highlights.add(actions.isEmpty()
                ? "No maintenance actions have been logged yet."
                : actions.size() + " recent maintenance action(s) are available.");

        return new AiReportSummaryResponse(
                severity,
                "AI report summary",
                "Recent monitoring data has been summarized from telemetry, alerts, forecast calibration, anomalies, and action logs.",
                snapshot.evidence(),
                highlights,
                fallbackActions(snapshot),
                "fallback",
                LocalDateTime.now()
        );
    }

    private AiAdvisorResponse advisorFromGpt(JsonNode node, List<AiEvidenceItem> evidence, AiAdvisorResponse fallback) {
        List<String> actions = stringList(node.path("recommendedActions"));
        if (actions.isEmpty()) {
            actions = fallback.recommendedActions();
        }

        return new AiAdvisorResponse(
                normalizeSeverity(text(node, "severity", fallback.severity())),
                text(node, "title", fallback.title()),
                text(node, "summary", fallback.summary()),
                evidence,
                actions,
                HUMAN_DECISION_OPTIONS,
                "gpt",
                LocalDateTime.now()
        );
    }

    private AiReportSummaryResponse reportFromGpt(JsonNode node, List<AiEvidenceItem> evidence, AiReportSummaryResponse fallback) {
        List<String> highlights = stringList(node.path("highlights"));
        if (highlights.isEmpty()) {
            highlights = fallback.highlights();
        }
        List<String> actions = stringList(node.path("recommendedActions"));
        if (actions.isEmpty()) {
            actions = fallback.recommendedActions();
        }

        return new AiReportSummaryResponse(
                normalizeSeverity(text(node, "severity", fallback.severity())),
                text(node, "title", fallback.title()),
                text(node, "summary", fallback.summary()),
                evidence,
                highlights,
                actions,
                "gpt",
                LocalDateTime.now()
        );
    }

    private List<String> fallbackActions(AdvisorSnapshot snapshot) {
        Set<String> actions = new LinkedHashSet<>();
        String yoloFinding = yoloFindingText(snapshot.yolo()).toLowerCase();

        if (containsAny(yoloFinding, "leaf", "debris", "trash", "foreign_object")) {
            actions.add("Remove visible debris and clean the tank inlet screen.");
            actions.add("Inspect the first-flush diverter and leaf guard before the next rainfall.");
            actions.add("Capture a new YOLO image after cleaning.");
        } else if (containsAny(yoloFinding, "insect")) {
            actions.add("Inspect the tank lid, mesh, and overflow screens for insect entry points.");
            actions.add("Remove insects and clean affected surfaces before use.");
            actions.add("Capture a follow-up image after sealing the entry point.");
        } else if (snapshot.yolo() != null && snapshot.yolo().getDetectionCount() != null && snapshot.yolo().getDetectionCount() > 0) {
            actions.add("Review the latest YOLO image and confirm whether detected objects are expected.");
        }

        IotTelemetryEntity telemetry = snapshot.telemetry();
        if (telemetry != null) {
            double phLow = snapshot.thresholds().get("ph_min");
            double phHigh = snapshot.thresholds().get("ph_max");
            double turbidityHigh = snapshot.thresholds().get("turbidity_high");
            double waterLevelLow = snapshot.thresholds().get("water_level_low");

            if (telemetry.getPh() != null && telemetry.getPh() < phLow) {
                actions.add("Inspect water source and rebalance pH before using stored water.");
            } else if (telemetry.getPh() != null && telemetry.getPh() > phHigh) {
                actions.add("Recheck pH with a manual test strip and inspect recent inflow sources.");
            }
            if (telemetry.getTurbidity() != null && telemetry.getTurbidity() > turbidityHigh) {
                actions.add("Inspect the tank for sediment, cloudiness, or disturbed inlet filters.");
            }
            if (telemetry.getWaterLevelPercent() != null && telemetry.getWaterLevelPercent() < waterLevelLow) {
                actions.add("Reduce nonessential usage and verify refill/collection path.");
            }
        } else {
            actions.add("Wait for the next ESP32 telemetry reading or verify sensor connectivity.");
        }

        if (snapshot.weather() != null && safeDouble(snapshot.weather().getRainfallAmount()) >= 25.0) {
            actions.add("Check overflow path and screens before heavy rainfall.");
        }
        if (snapshot.calibration() == null) {
            actions.add("Run tank storage calibration when the next reliable telemetry reading is available.");
        }

        if (actions.isEmpty()) {
            actions.add("Continue normal monitoring.");
            actions.add("Log an inspection if a human confirms the tank is clear.");
        }
        return actions.stream().limit(6).toList();
    }

    private String fallbackSeverity(AdvisorSnapshot snapshot) {
        AnomalyEntity anomaly = snapshot.anomaly();
        if (anomaly != null && "high".equalsIgnoreCase(anomaly.getSeverity())) {
            return "high";
        }

        IotTelemetryEntity telemetry = snapshot.telemetry();
        if (telemetry != null) {
            if (telemetry.getPh() != null && telemetry.getPh() < snapshot.thresholds().get("ph_min")) return "high";
            if (telemetry.getWaterLevelPercent() != null && telemetry.getWaterLevelPercent() < snapshot.thresholds().get("water_level_low")) return "high";
        }

        if (anomaly != null && "medium".equalsIgnoreCase(anomaly.getSeverity())) {
            return "medium";
        }
        if (telemetry != null) {
            if (telemetry.getPh() != null && telemetry.getPh() > snapshot.thresholds().get("ph_max")) return "medium";
            if (telemetry.getTurbidity() != null && telemetry.getTurbidity() > snapshot.thresholds().get("turbidity_high")) return "medium";
        }
        if (snapshot.yolo() != null && !"low".equalsIgnoreCase(snapshot.yolo().getSeverity())) {
            return normalizeSeverity(snapshot.yolo().getSeverity());
        }
        if (yoloHasSpecificContaminant(snapshot.yolo())) {
            return "medium";
        }
        if (snapshot.calibration() != null && safeDouble(snapshot.calibration().getAccuracyPercent()) < 75.0) {
            return "medium";
        }
        if (anomaly != null && "low".equalsIgnoreCase(anomaly.getSeverity())) {
            return "low";
        }
        return "normal";
    }

    private List<AiEvidenceItem> evidence(
            IotTelemetryEntity telemetry,
            WeatherRecordEntity weather,
            CameraRecordEntity yolo,
            CalibrationRecordEntity calibration,
            Map<String, Double> thresholds
    ) {
        List<AiEvidenceItem> evidence = new ArrayList<>();
        evidence.add(telemetry == null
                ? new AiEvidenceItem("pH", "No telemetry", "warning")
                : new AiEvidenceItem("pH", formatNumber(telemetry.getPh(), "pH"), phStatus(telemetry.getPh(), thresholds)));
        evidence.add(telemetry == null
                ? new AiEvidenceItem("Turbidity", "No telemetry", "warning")
                : new AiEvidenceItem("Turbidity", formatNumber(telemetry.getTurbidity(), "NTU"), turbidityStatus(telemetry.getTurbidity(), thresholds)));
        evidence.add(telemetry == null
                ? new AiEvidenceItem("Water level", "No telemetry", "warning")
                : new AiEvidenceItem("Water level", formatNumber(telemetry.getWaterLevelPercent(), "%"), waterLevelStatus(telemetry.getWaterLevelPercent(), thresholds)));
        evidence.add(weather == null
                ? new AiEvidenceItem("Forecast rainfall", "No saved forecast", "warning")
                : new AiEvidenceItem("Forecast rainfall", rainfallText(weather), rainfallStatus(weather)));
        evidence.add(new AiEvidenceItem("Camera/YOLO anomaly", yoloFindingText(yolo), yoloStatus(yolo)));
        evidence.add(new AiEvidenceItem("Calibration status", calibrationStatusText(calibration), calibrationStatus(calibration)));
        return evidence;
    }

    private Map<String, Double> thresholds() {
        Map<String, Double> thresholds = new LinkedHashMap<>();
        thresholds.put("ph_min", thresholdService.getThreshold("ph_min", 6.5, "pH", "Minimum acceptable pH."));
        thresholds.put("ph_max", thresholdService.getThreshold("ph_max", 8.5, "pH", "Maximum acceptable pH."));
        thresholds.put("turbidity_high", thresholdService.getThreshold("turbidity_high", 100.0, "NTU", "High turbidity threshold."));
        thresholds.put("water_level_low", thresholdService.getThreshold("water_level_low", 20.0, "%", "Low water level threshold."));
        thresholds.put("water_temperature_low", thresholdService.getThreshold("water_temperature_low", 10.0, "C", "Low water temperature threshold."));
        thresholds.put("water_temperature_high", thresholdService.getThreshold("water_temperature_high", 35.0, "C", "High water temperature threshold."));
        return thresholds;
    }

    private Map<String, Object> calibrationSummary(CalibrationRecordEntity calibration) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (calibration == null) {
            result.put("status", "Needs Calibration");
            result.put("accuracyPercent", null);
            result.put("recommendation", "Run calibration when telemetry and forecast output are available.");
            return result;
        }
        result.put("status", calibrationStatusText(calibration));
        result.put("accuracyPercent", calibration.getAccuracyPercent());
        result.put("errorValue", calibration.getErrorValue());
        result.put("calibrationOffset", calibration.getCalibrationOffset());
        result.put("recommendation", calibration.getRecommendation());
        result.put("createdAt", calibration.getCreatedAt());
        return result;
    }

    private Optional<JsonNode> callOpenAiJson(String schemaName, ObjectNode schema, String instructions, ObjectNode context) {
        if (!openAiEnabled || openAiApiKey.isBlank()) {
            return Optional.empty();
        }
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", openAiModel);
            body.put("instructions", instructions);
            body.put("input", objectMapper.writeValueAsString(context));

            ObjectNode text = body.putObject("text");
            ObjectNode format = text.putObject("format");
            format.put("type", "json_schema");
            format.put("name", schemaName);
            format.put("strict", true);
            format.set("schema", schema);

            JsonNode response = restClient.post()
                    .uri(responsesUrl)
                    .headers((headers) -> headers.setBearerAuth(openAiApiKey))
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String outputText = extractOutputText(response);
            if (outputText == null || outputText.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readTree(outputText));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private ObjectNode advisorSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ObjectNode properties = schema.putObject("properties");
        enumString(properties.putObject("severity"), List.of("normal", "low", "medium", "high"));
        properties.putObject("title").put("type", "string");
        properties.putObject("summary").put("type", "string");
        stringArray(properties.putObject("recommendedActions"));
        required(schema, "severity", "title", "summary", "recommendedActions");
        return schema;
    }

    private ObjectNode reportSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ObjectNode properties = schema.putObject("properties");
        enumString(properties.putObject("severity"), List.of("normal", "low", "medium", "high"));
        properties.putObject("title").put("type", "string");
        properties.putObject("summary").put("type", "string");
        stringArray(properties.putObject("highlights"));
        stringArray(properties.putObject("recommendedActions"));
        required(schema, "severity", "title", "summary", "highlights", "recommendedActions");
        return schema;
    }

    private void stringArray(ObjectNode node) {
        node.put("type", "array");
        node.putObject("items").put("type", "string");
    }

    private void enumString(ObjectNode node, List<String> values) {
        node.put("type", "string");
        ArrayNode enumNode = node.putArray("enum");
        values.forEach(enumNode::add);
    }

    private void required(ObjectNode schema, String... names) {
        ArrayNode required = schema.putArray("required");
        for (String name : names) {
            required.add(name);
        }
    }

    private String extractOutputText(JsonNode response) {
        if (response == null || response.isNull() || response.isMissingNode()) {
            return null;
        }
        if (response.path("output_text").isTextual()) {
            return response.path("output_text").asText();
        }
        JsonNode output = response.path("output");
        if (!output.isArray()) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        for (JsonNode item : output) {
            JsonNode content = item.path("content");
            if (!content.isArray()) continue;
            for (JsonNode part : content) {
                if (part.path("text").isTextual()) {
                    builder.append(part.path("text").asText());
                }
            }
        }
        return builder.isEmpty() ? null : builder.toString();
    }

    private JsonNode valueNode(Object value) {
        return value == null ? objectMapper.nullNode() : objectMapper.valueToTree(value);
    }

    private List<String> stringList(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode item : node) {
                if (item.isTextual() && !item.asText().isBlank()) {
                    values.add(item.asText());
                }
            }
        }
        return values;
    }

    private String phStatus(Double value, Map<String, Double> thresholds) {
        if (value == null) return "warning";
        if (value < thresholds.get("ph_min")) return "critical";
        if (value > thresholds.get("ph_max")) return "warning";
        return "normal";
    }

    private String turbidityStatus(Double value, Map<String, Double> thresholds) {
        if (value == null) return "warning";
        double limit = thresholds.get("turbidity_high");
        if (value > limit * 1.5) return "critical";
        if (value > limit) return "warning";
        return "normal";
    }

    private String waterLevelStatus(Double value, Map<String, Double> thresholds) {
        if (value == null) return "warning";
        return value < thresholds.get("water_level_low") ? "critical" : "normal";
    }

    private String rainfallStatus(WeatherRecordEntity weather) {
        double amount = safeDouble(weather.getRainfallAmount());
        double probability = safeDouble(weather.getRainfallProbability());
        if (amount >= 50.0 || probability >= 90.0) return "critical";
        if (amount >= 25.0 || probability >= 70.0) return "warning";
        return "normal";
    }

    private String yoloStatus(CameraRecordEntity yolo) {
        if (yolo == null) return "normal";
        if ("high".equalsIgnoreCase(yolo.getSeverity())) return "critical";
        if ("medium".equalsIgnoreCase(yolo.getSeverity()) || yoloHasSpecificContaminant(yolo)) return "warning";
        return "normal";
    }

    private String calibrationStatus(CalibrationRecordEntity calibration) {
        if (calibration == null || calibration.getAccuracyPercent() == null) return "warning";
        if (calibration.getAccuracyPercent() < 75.0) return "critical";
        if (calibration.getAccuracyPercent() < 90.0) return "warning";
        return "normal";
    }

    private String yoloFindingText(CameraRecordEntity yolo) {
        if (yolo == null) {
            return "No saved YOLO result";
        }
        String labels = yoloLabels(yolo);
        if (!labels.isBlank()) {
            return labels + " (" + emptyToDefault(yolo.getVisualStatus(), "visual status unknown") + ")";
        }
        return emptyToDefault(yolo.getVisualStatus(), "YOLO completed without saved labels");
    }

    private boolean yoloHasSpecificContaminant(CameraRecordEntity yolo) {
        return yolo != null && containsAny(yoloFindingText(yolo).toLowerCase(), "leaf", "debris", "trash", "insect", "foreign_object");
    }

    private String yoloLabels(CameraRecordEntity yolo) {
        if (yolo == null || yolo.getDetectionsJson() == null || yolo.getDetectionsJson().isBlank()) {
            return "";
        }
        try {
            JsonNode detections = objectMapper.readTree(yolo.getDetectionsJson());
            if (!detections.isArray()) {
                return "";
            }
            List<String> labels = new ArrayList<>();
            for (JsonNode detection : detections) {
                String label = text(detection, "label", "");
                if (!label.isBlank()) {
                    labels.add(label);
                }
            }
            return String.join(", ", labels);
        } catch (Exception ex) {
            return yolo.getDetectionsJson();
        }
    }

    private String calibrationStatusText(CalibrationRecordEntity calibration) {
        if (calibration == null || calibration.getAccuracyPercent() == null) {
            return "Needs Calibration";
        }
        if (calibration.getAccuracyPercent() >= 90.0) return "Calibrated (" + formatPercent(calibration.getAccuracyPercent()) + ")";
        if (calibration.getAccuracyPercent() >= 75.0) return "Pending (" + formatPercent(calibration.getAccuracyPercent()) + ")";
        return "Needs Calibration (" + formatPercent(calibration.getAccuracyPercent()) + ")";
    }

    private String rainfallText(WeatherRecordEntity weather) {
        String amount = formatNumber(weather.getRainfallAmount(), "mm");
        if (weather.getRainfallProbability() == null) {
            return amount;
        }
        return amount + " / " + formatPercent(weather.getRainfallProbability()) + " chance";
    }

    private String formatNumber(Double value, String unit) {
        if (value == null || value.isNaN() || value.isInfinite()) return "No data";
        return String.format("%.1f %s", value, unit).trim();
    }

    private String formatPercent(Double value) {
        if (value == null || value.isNaN() || value.isInfinite()) return "No data";
        return String.format("%.1f%%", value);
    }

    private double safeDouble(Double value) {
        if (value == null || value.isNaN() || value.isInfinite()) return 0.0;
        return value;
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) return true;
        }
        return false;
    }

    private String normalizeSeverity(String severity) {
        if ("high".equalsIgnoreCase(severity)) return "high";
        if ("medium".equalsIgnoreCase(severity)) return "medium";
        if ("low".equalsIgnoreCase(severity)) return "low";
        return "normal";
    }

    private String text(JsonNode node, String field, String fallback) {
        if (node == null || node.path(field).isMissingNode() || node.path(field).isNull()) {
            return fallback;
        }
        String value = node.path(field).asText();
        return value == null || value.isBlank() ? fallback : value;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimToNull(String value) {
        String trimmed = trim(value);
        return trimmed.isBlank() ? null : trimmed;
    }

    private String emptyToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record AdvisorSnapshot(
            IotTelemetryEntity telemetry,
            WeatherRecordEntity weather,
            AnomalyEntity anomaly,
            CameraRecordEntity yolo,
            CalibrationRecordEntity calibration,
            Map<String, Double> thresholds,
            List<AiEvidenceItem> evidence,
            ObjectNode context
    ) {
    }
}
