package com.raincatcher.backend.forecast;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.raincatcher.backend.calibration.CalibrationRecordEntity;
import com.raincatcher.backend.calibration.CalibrationRecordRepository;
import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import com.raincatcher.backend.weather.WeatherRecordEntity;
import com.raincatcher.backend.weather.WeatherRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class ForecastService {

    private static final Set<String> SUPPORTED_MODULES = Set.of(
            "tank-storage",
            "weekly-harvest",
            "monthly-harvest",
            "risk",
            "usable-water",
            "benchmark",
            "what-if-scenario",
            "ai-recommendation"
    );

    private static final String TANK_NAME = "Rainwater Tank A";
    private static final double DEFAULT_TANK_CAPACITY_LITRES = 3.0;
    private static final double DEFAULT_DAILY_USAGE_LITRES = 0.5;
    private static final double DEFAULT_CATCHMENT_AREA_M2 = 75.0;
    private static final double DEFAULT_RUNOFF_COEFFICIENT = 0.82;

    private final ForecastRunRepository repository;
    private final ObjectMapper objectMapper;
    private final IotTelemetryRepository telemetryRepository;
    private final WeatherRecordRepository weatherRepository;
    private final CalibrationRecordRepository calibrationRecordRepository;

    public ForecastService(
            ForecastRunRepository repository,
            ObjectMapper objectMapper,
            IotTelemetryRepository telemetryRepository,
            WeatherRecordRepository weatherRepository,
            CalibrationRecordRepository calibrationRecordRepository
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.telemetryRepository = telemetryRepository;
        this.weatherRepository = weatherRepository;
        this.calibrationRecordRepository = calibrationRecordRepository;
    }

    @Transactional
    public JsonNode run(String module, JsonNode payload) {
        if (!SUPPORTED_MODULES.contains(module)) {
            throw new IllegalArgumentException("Unsupported forecast module: " + module);
        }

        JsonNode safePayload = payload == null || payload.isNull() ? objectMapper.createObjectNode() : payload;
        ForecastRunEntity run = new ForecastRunEntity();
        run.setModule(module);
        run.setStatus("started");
        run.setInputJson(jsonString(safePayload));
        run.setCreatedAt(LocalDateTime.now());
        run = repository.save(run);

        try {
            ObjectNode result = switch (module) {
                case "tank-storage" -> tankStorage(safePayload);
                case "weekly-harvest" -> weeklyHarvest(safePayload);
                case "monthly-harvest" -> monthlyHarvest(safePayload);
                case "risk" -> risk(safePayload);
                case "usable-water" -> usableWater(safePayload);
                case "benchmark" -> benchmark(safePayload);
                case "what-if-scenario" -> whatIfScenario(safePayload);
                case "ai-recommendation" -> aiRecommendation();
                default -> throw new IllegalArgumentException("Unsupported forecast module: " + module);
            };

            result.put("module", module);
            result.put("status", "completed");
            result.put("createdAt", LocalDateTime.now().toString());

            run.setStatus("completed");
            run.setResultJson(jsonString(result));
            run.setCompletedAt(LocalDateTime.now());
            repository.save(run);
            return result;
        } catch (RuntimeException ex) {
            run.setStatus("failed");
            run.setErrorMessage(ex.getMessage());
            run.setCompletedAt(LocalDateTime.now());
            repository.save(run);
            throw ex;
        }
    }

    public List<ForecastRunEntity> getHistory() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    public ForecastRunEntity getById(Long id) {
        return repository.findById(id).orElseThrow();
    }

    private ObjectNode tankStorage(JsonNode payload) {
        Optional<IotTelemetryEntity> telemetry = latestTelemetry();
        Optional<WeatherRecordEntity> weather = latestWeatherRecord();
        int days = clamp(readInt(payload, "forecastDays", 7), 1, 30);
        double capacity = positive(readDouble(payload, "tankCapacityLitres", DEFAULT_TANK_CAPACITY_LITRES), DEFAULT_TANK_CAPACITY_LITRES);
        double dailyUsage = positive(readDouble(payload, "dailyUsageLitres", DEFAULT_DAILY_USAGE_LITRES), DEFAULT_DAILY_USAGE_LITRES);
        double catchmentArea = positive(readDouble(payload, "catchmentAreaM2", DEFAULT_CATCHMENT_AREA_M2), DEFAULT_CATCHMENT_AREA_M2);
        double runoff = positive(readDouble(payload, "runoffCoefficient", DEFAULT_RUNOFF_COEFFICIENT), DEFAULT_RUNOFF_COEFFICIENT);
        double currentLevel = telemetry.map(IotTelemetryEntity::getWaterLevelPercent)
                .filter(this::isNumber)
                .orElse(readDouble(payload, "startingTankLevelPercent", 0.0));
        double currentVolume = readDouble(payload, "currentTankVolumeLitres", capacity * currentLevel / 100.0);
        double[] rainfall = rainfallSeries(payload, "dailyRainfallMm", days);

        ArrayNode dailyProjection = objectMapper.createArrayNode();
        double storage = clampDouble(currentVolume, 0.0, capacity);
        double lowest = percent(storage, capacity);
        double highest = lowest;
        int overflowDays = 0;
        int shortageDays = 0;

        for (int day = 1; day <= days; day++) {
            double rainfallMm = rainfall[day - 1];
            double harvestLitres = rainfallMm * catchmentArea * runoff;
            double projected = storage + harvestLitres - dailyUsage;
            if (projected > capacity) overflowDays++;
            storage = clampDouble(projected, 0.0, capacity);
            double level = percent(storage, capacity);
            if (level < 20.0) shortageDays++;
            lowest = Math.min(lowest, level);
            highest = Math.max(highest, level);

            ObjectNode point = objectMapper.createObjectNode();
            point.put("day", day);
            point.put("rainfallMm", round(rainfallMm));
            point.put("harvestLitres", round(harvestLitres));
            point.put("usageLitres", round(dailyUsage));
            point.put("storageLitres", round(storage));
            point.put("levelPercent", round(level));
            dailyProjection.add(point);
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.set("dailyProjection", dailyProjection);
        double rawForecastLevel = round(percent(storage, capacity));
        Optional<CalibrationRecordEntity> calibration = calibrationRecordRepository.findTopByModuleOrderByCreatedAtDesc("tank_storage");
        double calibrationOffset = calibration.map(CalibrationRecordEntity::getCalibrationOffset).filter(this::isNumber).orElse(0.0);
        boolean calibrationApplied = calibration.isPresent();
        double calibratedForecastLevel = clampDouble(rawForecastLevel + calibrationOffset, 0.0, 100.0);

        result.put("finalLevelPercent", rawForecastLevel);
        result.put("rawForecastLevel", rawForecastLevel);
        result.put("calibrationOffset", round(calibrationOffset));
        result.put("calibratedForecastLevel", round(calibratedForecastLevel));
        result.put("calibrationApplied", calibrationApplied);
        calibration.map(CalibrationRecordEntity::getAccuracyPercent)
                .filter(this::isNumber)
                .ifPresent((accuracy) -> result.put("calibrationAccuracyPercent", round(accuracy)));
        result.put("lowestLevelPercent", round(lowest));
        result.put("highestLevelPercent", round(highest));
        result.put("overflowDays", overflowDays);
        result.put("shortageDays", shortageDays);
        result.put("recommendation", storageRecommendation(percent(storage, capacity), lowest, overflowDays, telemetry.isPresent(), weather.isPresent()));
        result.set("sourceValues", sourceValues(telemetry, weather));
        return result;
    }

    private ObjectNode weeklyHarvest(JsonNode payload) {
        double area = positive(readDouble(payload, "catchmentAreaM2", DEFAULT_CATCHMENT_AREA_M2), DEFAULT_CATCHMENT_AREA_M2);
        double runoff = positive(readDouble(payload, "runoffCoefficient", DEFAULT_RUNOFF_COEFFICIENT), DEFAULT_RUNOFF_COEFFICIENT);
        double[] rainfall = rainfallSeries(payload, "weeklyRainfallMm", 7);
        ArrayNode dailyHarvest = objectMapper.createArrayNode();
        double total = 0.0;

        for (double rainfallMm : rainfall) {
            double harvest = rainfallMm * area * runoff;
            total += harvest;
            dailyHarvest.add(round(harvest));
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.set("dailyHarvest", dailyHarvest);
        result.put("totalHarvestLitres", round(total));
        result.put("recommendation", total > 0
                ? "Weekly harvest is based on persisted Shah Alam weather input and catchment assumptions."
                : "No rainfall amount is available in weather_records yet, so projected weekly harvest is zero.");
        result.set("sourceValues", sourceValues(latestTelemetry(), latestWeatherRecord()));
        return result;
    }

    private ObjectNode monthlyHarvest(JsonNode payload) {
        double area = positive(readDouble(payload, "catchmentAreaM2", DEFAULT_CATCHMENT_AREA_M2), DEFAULT_CATCHMENT_AREA_M2);
        double runoff = positive(readDouble(payload, "runoffCoefficient", DEFAULT_RUNOFF_COEFFICIENT), DEFAULT_RUNOFF_COEFFICIENT);
        double[] rainfall = rainfallSeries(payload, "monthlyRainfallMm", 30);
        double total = 0.0;
        for (double rainfallMm : rainfall) {
            total += rainfallMm * area * runoff;
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.put("totalHarvestLitres", round(total));
        result.put("recommendation", total > 0
                ? "Monthly harvest uses the supplied rainfall series or the latest persisted weather record."
                : "No rainfall amount is available in weather_records yet, so projected monthly harvest is zero.");
        result.set("sourceValues", sourceValues(latestTelemetry(), latestWeatherRecord()));
        return result;
    }

    private ObjectNode usableWater(JsonNode payload) {
        Optional<IotTelemetryEntity> telemetry = latestTelemetry();
        double capacity = positive(readDouble(payload, "tankCapacityLitres", DEFAULT_TANK_CAPACITY_LITRES), DEFAULT_TANK_CAPACITY_LITRES);
        double level = telemetry.map(IotTelemetryEntity::getWaterLevelPercent)
                .filter(this::isNumber)
                .orElse(percent(readDouble(payload, "currentTankVolumeLitres", 0.0), capacity));
        double ph = telemetry.map(IotTelemetryEntity::getPh).filter(this::isNumber).orElse(readDouble(payload, "ph", 7.0));
        double turbidity = telemetry.map(IotTelemetryEntity::getTurbidity).filter(this::isNumber).orElse(readDouble(payload, "turbidityNtu", 0.0));

        double qualityFactor = 1.0;
        List<String> notes = new ArrayList<>();
        if (ph < 6.5 || ph > 8.5) {
            qualityFactor *= 0.72;
            notes.add("pH is outside the safe operating range.");
        }
        if (turbidity > 100.0) {
            qualityFactor *= 0.70;
            notes.add("Turbidity is above the high threshold.");
        } else if (turbidity > 5.0) {
            qualityFactor *= 0.90;
            notes.add("Turbidity is elevated and should be watched.");
        }

        double usablePercent = clampDouble(level * qualityFactor, 0.0, 100.0);
        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.put("usableWaterLitres", round(capacity * usablePercent / 100.0));
        result.put("usableWaterPercent", round(usablePercent));
        result.put("recommendation", notes.isEmpty()
                ? "Usable water is based on the latest ESP32 level, pH, and turbidity readings."
                : String.join(" ", notes) + " Inspect treatment and filtration before using this water.");
        result.set("sourceValues", sourceValues(telemetry, latestWeatherRecord()));
        return result;
    }

    private ObjectNode risk(JsonNode payload) {
        Optional<IotTelemetryEntity> telemetry = latestTelemetry();
        Optional<WeatherRecordEntity> weather = latestWeatherRecord();
        double level = telemetry.map(IotTelemetryEntity::getWaterLevelPercent)
                .filter(this::isNumber)
                .orElse(readFirstArrayValue(payload, "projectedTankLevels", 0.0));
        double rainfall = latestRainfallAmount();
        double ph = telemetry.map(IotTelemetryEntity::getPh).filter(this::isNumber).orElse(readDouble(payload, "phValue", 7.0));
        double turbidity = telemetry.map(IotTelemetryEntity::getTurbidity).filter(this::isNumber).orElse(readDouble(payload, "turbidityNtu", 0.0));
        double temperature = telemetry.map(IotTelemetryEntity::getWaterTemperature)
                .filter(this::isNumber)
                .orElse(readDouble(payload, "waterTemperatureCelsius", 28.0));

        int shortageRisk = level < 20.0 ? 85 : level < 35.0 ? 55 : 12;
        int overflowRisk = level > 90.0 && rainfall > 10.0 ? 75 : level > 95.0 ? 60 : rainfall > 25.0 ? 45 : 10;
        int qualityRisk = 10;
        if (ph < 6.5 || ph > 8.5) qualityRisk = Math.max(qualityRisk, 75);
        if (turbidity > 100.0) qualityRisk = Math.max(qualityRisk, 70);
        if (temperature < 10.0 || temperature > 35.0) qualityRisk = Math.max(qualityRisk, 45);
        int reliabilityRisk = telemetry.map(this::secondsSinceTelemetry).orElse(999_999L) > 120 ? 65 : 8;
        int maxRisk = Math.max(Math.max(shortageRisk, overflowRisk), Math.max(qualityRisk, reliabilityRisk));
        String riskLevel = maxRisk >= 70 ? "high" : maxRisk >= 40 ? "medium" : "low";

        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.put("overallRiskLevel", riskLevel);
        result.put("overflowRiskPercent", overflowRisk);
        result.put("shortageRiskPercent", shortageRisk);
        result.put("waterQualityRiskPercent", qualityRisk);
        result.put("sensorReliabilityRiskPercent", reliabilityRisk);
        result.put("recommendedAction", riskAction(riskLevel, ph, turbidity, level, rainfall, telemetry.isPresent(), weather.isPresent()));
        result.set("sourceValues", sourceValues(telemetry, weather));
        return result;
    }

    private ObjectNode benchmark(JsonNode payload) {
        Optional<IotTelemetryEntity> telemetry = latestTelemetry();
        double observed = readDouble(payload, "observedLevelPercent",
                telemetry.map(IotTelemetryEntity::getWaterLevelPercent).filter(this::isNumber).orElse(0.0));
        double forecasted = readDouble(payload, "forecastedLevelPercent", estimateSevenDayFinalLevel(observed));
        double deviation = Math.abs(forecasted - observed);
        double accuracy = clampDouble(100.0 - deviation, 0.0, 100.0);

        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.put("forecastedLevelPercent", round(forecasted));
        result.put("observedLevelPercent", round(observed));
        result.put("deviationPercent", round(deviation));
        result.put("accuracyPercent", round(accuracy));
        result.put("recommendation", telemetry.isPresent()
                ? "Benchmark compared the current ESP32 observed level with the Spring Boot forecast estimate."
                : "No ESP32 telemetry is available, so benchmark confidence is low until live readings arrive.");
        result.set("sourceValues", sourceValues(telemetry, latestWeatherRecord()));
        return result;
    }

    private ObjectNode whatIfScenario(JsonNode payload) {
        Optional<IotTelemetryEntity> telemetry = latestTelemetry();
        Optional<WeatherRecordEntity> weather = latestWeatherRecord();
        int days = clamp(readInt(payload, "forecastPeriodDays", 7), 1, 30);
        double capacity = positive(readDouble(payload, "tankCapacityLitres", DEFAULT_TANK_CAPACITY_LITRES), DEFAULT_TANK_CAPACITY_LITRES);
        double startingLevel = readDouble(payload, "startingTankLevelPercent",
                telemetry.map(IotTelemetryEntity::getWaterLevelPercent).filter(this::isNumber).orElse(0.0));
        double efficiency = positive(readDouble(payload, "collectionEfficiencyPercent", DEFAULT_RUNOFF_COEFFICIENT * 100.0), DEFAULT_RUNOFF_COEFFICIENT * 100.0) / 100.0;
        double usageChange = readDouble(payload, "usageChangePercent", 0.0);
        double rainfallChange = readDouble(payload, "rainfallChangePercent", 0.0);
        double dailyUsage = DEFAULT_DAILY_USAGE_LITRES * (1.0 + usageChange / 100.0);
        if (dailyUsage <= 0.0) dailyUsage = DEFAULT_DAILY_USAGE_LITRES;
        double baseRainfall = latestRainfallAmount();
        double scenarioRainfall = baseRainfall > 0.0
                ? Math.max(0.0, baseRainfall * (1.0 + rainfallChange / 100.0))
                : Math.max(0.0, rainfallChange);

        double storage = capacity * clampDouble(startingLevel, 0.0, 100.0) / 100.0;
        double lowest = percent(storage, capacity);
        for (int day = 0; day < days; day++) {
            double rainfallForDay = day == 0 ? scenarioRainfall : 0.0;
            storage = clampDouble(storage + rainfallForDay * DEFAULT_CATCHMENT_AREA_M2 * efficiency - dailyUsage, 0.0, capacity);
            lowest = Math.min(lowest, percent(storage, capacity));
        }

        double finalLevel = percent(storage, capacity);
        int overflowRisk = finalLevel > 92.0 || (startingLevel > 90.0 && scenarioRainfall > 15.0) ? 65 : scenarioRainfall > 25.0 ? 40 : 10;
        int shortageRisk = lowest < 20.0 ? 80 : lowest < 35.0 ? 55 : 12;
        String overflowLabel = riskLabel(overflowRisk);
        String shortageLabel = riskLabel(shortageRisk);

        ObjectNode inputSummary = objectMapper.createObjectNode();
        inputSummary.put("startingTankLevelPercent", round(startingLevel));
        inputSummary.put("rainfallInput", round(rainfallChange));
        inputSummary.put("scenarioRainfallMm", round(scenarioRainfall));
        inputSummary.put("usageChangePercent", round(usageChange));
        inputSummary.put("forecastPeriodDays", days);

        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.put("scenarioName", text(payload, "scenarioName", "What-if scenario"));
        result.put("projectedFinalLevel", round(finalLevel));
        result.put("lowestLevel", round(lowest));
        result.put("overflowRiskPercent", overflowRisk);
        result.put("overflowRisk", overflowLabel);
        result.put("shortageRiskPercent", shortageRisk);
        result.put("shortageRisk", shortageLabel);
        result.put("estimatedStorage", round(storage));
        result.put("waterLevelPercent", round(finalLevel));
        result.put("riskLevel", riskLabel(Math.max(overflowRisk, shortageRisk)));
        result.put("scenarioSummary", "Scenario uses the latest ESP32 tank level and persisted weather rainfall when available.");
        result.put("recommendation", scenarioRecommendation(shortageRisk, overflowRisk, weather.isPresent()));
        result.set("inputSummary", inputSummary);
        result.set("sourceValues", sourceValues(telemetry, weather));
        return result;
    }

    private ObjectNode aiRecommendation() {
        Optional<IotTelemetryEntity> telemetry = latestTelemetry();
        Optional<WeatherRecordEntity> weather = latestWeatherRecord();
        List<String> actions = new ArrayList<>();
        String severity = "low";

        if (telemetry.isEmpty()) {
            severity = "medium";
            actions.add("No ESP32 telemetry is available. Check ESP32 Wi-Fi, power, and POST delivery to /api/iot/telemetry.");
        } else {
            IotTelemetryEntity t = telemetry.get();
            if (!isNumber(t.getPh()) || t.getPh() < 6.5 || t.getPh() > 8.5) {
                severity = "high";
                actions.add("pH is outside the safe threshold. Calibrate the pH probe and check treatment dosing.");
            }
            if (isNumber(t.getTurbidity()) && t.getTurbidity() > 100.0) {
                severity = "high";
                actions.add("Turbidity is high. Inspect filtration, settling, and possible sediment disturbance.");
            } else if (isNumber(t.getTurbidity()) && t.getTurbidity() > 5.0) {
                if (!"high".equals(severity)) severity = "medium";
                actions.add("Turbidity is elevated. Continue monitoring and inspect the filter if it rises.");
            }
            if (isNumber(t.getWaterLevelPercent()) && t.getWaterLevelPercent() < 20.0 && latestRainfallAmount() <= 1.0) {
                if (!"high".equals(severity)) severity = "medium";
                actions.add("Water level is low and rainfall input is low. Prepare conservation or backup supply.");
            }
            if (isNumber(t.getWaterLevelPercent()) && t.getWaterLevelPercent() > 90.0 && latestRainfallAmount() > 10.0) {
                if (!"high".equals(severity)) severity = "medium";
                actions.add("Rain is expected while storage is high. Monitor overflow and drainage.");
            }
            if (secondsSinceTelemetry(t) > 120) {
                if (!"high".equals(severity)) severity = "medium";
                actions.add("Latest telemetry is stale. Check ESP32 connectivity and backend ingestion.");
            }
        }

        if (weather.isEmpty()) {
            actions.add("Weather records are not available yet. Configure ACCUWEATHER_API_KEY on the Raspberry Pi backend.");
        }
        if (actions.isEmpty()) {
            actions.add("Telemetry and weather inputs are within normal operating ranges. Continue routine monitoring.");
        }

        ArrayNode actionList = objectMapper.createArrayNode();
        actions.forEach(actionList::add);

        ObjectNode result = objectMapper.createObjectNode();
        result.put("tank", TANK_NAME);
        result.put("severity", severity);
        result.put("recommendation", String.join(" ", actions));
        result.set("actions", actionList);
        result.set("sourceValues", sourceValues(telemetry, weather));
        result.put("createdAt", LocalDateTime.now().toString());
        return result;
    }

    private Optional<IotTelemetryEntity> latestTelemetry() {
        return telemetryRepository.findTopByOrderByIdDesc();
    }

    private Optional<WeatherRecordEntity> latestWeatherRecord() {
        return weatherRepository.findTopByOrderByRecordedAtDesc();
    }

    private double latestRainfallAmount() {
        return List.of("rainfall", "daily", "hourly", "current").stream()
                .map(weatherRepository::findTopByRecordTypeOrderByRecordedAtDesc)
                .flatMap(Optional::stream)
                .map(WeatherRecordEntity::getRainfallAmount)
                .filter(this::isNumber)
                .findFirst()
                .orElse(0.0);
    }

    private double[] rainfallSeries(JsonNode payload, String fieldName, int days) {
        double[] values = new double[days];
        JsonNode array = payload.path(fieldName);
        if (array.isArray() && !array.isEmpty()) {
            for (int i = 0; i < days; i++) {
                JsonNode item = i < array.size() ? array.get(i) : null;
                values[i] = item != null && item.isNumber() ? Math.max(0.0, item.asDouble()) : 0.0;
            }
            return values;
        }
        values[0] = latestRainfallAmount();
        return values;
    }

    private double estimateSevenDayFinalLevel(double observed) {
        double capacity = DEFAULT_TANK_CAPACITY_LITRES;
        double storage = capacity * clampDouble(observed, 0.0, 100.0) / 100.0;
        storage = storage + latestRainfallAmount() * DEFAULT_CATCHMENT_AREA_M2 * DEFAULT_RUNOFF_COEFFICIENT - (DEFAULT_DAILY_USAGE_LITRES * 7.0);
        return percent(clampDouble(storage, 0.0, capacity), capacity);
    }

    private ObjectNode sourceValues(Optional<IotTelemetryEntity> telemetry, Optional<WeatherRecordEntity> weather) {
        ObjectNode source = objectMapper.createObjectNode();
        if (telemetry.isPresent()) {
            IotTelemetryEntity t = telemetry.get();
            source.put("telemetryId", t.getId());
            source.put("deviceId", t.getDeviceId());
            source.put("telemetryCreatedAt", t.getCreatedAt() == null ? null : t.getCreatedAt().toString());
            source.put("ph", nullSafe(t.getPh()));
            source.put("turbidity", nullSafe(t.getTurbidity()));
            source.put("waterTemperature", nullSafe(t.getWaterTemperature()));
            source.put("waterLevelPercent", nullSafe(t.getWaterLevelPercent()));
            source.put("secondsSinceLastReading", secondsSinceTelemetry(t));
        } else {
            source.put("telemetryStatus", "unavailable");
        }
        if (weather.isPresent()) {
            WeatherRecordEntity w = weather.get();
            source.put("weatherRecordId", w.getId());
            source.put("weatherRecordType", w.getRecordType());
            source.put("location", w.getLocation());
            source.put("rainfallAmount", nullSafe(w.getRainfallAmount()));
            source.put("rainfallProbability", nullSafe(w.getRainfallProbability()));
            source.put("weatherCondition", w.getWeatherCondition());
            source.put("weatherRecordedAt", w.getRecordedAt() == null ? null : w.getRecordedAt().toString());
        } else {
            source.put("weatherStatus", "unavailable");
        }
        return source;
    }

    private String storageRecommendation(double finalLevel, double lowest, int overflowDays, boolean telemetryAvailable, boolean weatherAvailable) {
        if (!telemetryAvailable) return "Forecast is limited because no ESP32 telemetry is available.";
        if (!weatherAvailable) return "Forecast used telemetry only because weather_records has no saved AccuWeather data yet.";
        if (overflowDays > 0) return "Potential overflow days detected. Monitor drainage and overflow routing.";
        if (lowest < 20.0) return "Projected storage may drop below the low threshold. Prepare conservation or backup supply.";
        if (finalLevel < 35.0) return "Storage is trending low. Watch demand and rainfall updates.";
        return "Storage projection remains within the normal operating range.";
    }

    private String riskAction(String riskLevel, double ph, double turbidity, double level, double rainfall, boolean telemetryAvailable, boolean weatherAvailable) {
        if (!telemetryAvailable) return "Check ESP32 connectivity before trusting the risk score.";
        if ("high".equals(riskLevel) && (ph < 6.5 || ph > 8.5)) return "Treat pH out-of-range as the highest priority and verify calibration.";
        if ("high".equals(riskLevel) && turbidity > 100.0) return "Inspect filtration and tank clarity immediately.";
        if (level < 20.0) return "Low storage risk detected. Reduce demand and prepare backup supply.";
        if (level > 90.0 && rainfall > 10.0) return "High storage with incoming rain. Monitor overflow.";
        if (!weatherAvailable) return "Risk uses telemetry only until AccuWeather data is persisted.";
        return "Continue normal monitoring.";
    }

    private String scenarioRecommendation(int shortageRisk, int overflowRisk, boolean weatherAvailable) {
        if (shortageRisk >= 70) return "Shortage risk is high. Reduce usage or prepare backup supply.";
        if (overflowRisk >= 60) return "Overflow risk is elevated. Monitor storage level and drainage.";
        if (!weatherAvailable) return "Scenario used manual rainfall input because weather_records is unavailable.";
        return "Scenario remains within acceptable operating range.";
    }

    private String riskLabel(int percent) {
        if (percent >= 70) return "High";
        if (percent >= 40) return "Medium";
        return "Low";
    }

    private double readDouble(JsonNode node, String fieldName, double fallback) {
        JsonNode value = node.path(fieldName);
        if (value.isNumber()) return value.asDouble();
        if (value.isTextual()) {
            try {
                return Double.parseDouble(value.asText());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private int readInt(JsonNode node, String fieldName, int fallback) {
        JsonNode value = node.path(fieldName);
        if (value.isInt() || value.isLong()) return value.asInt();
        if (value.isNumber()) return (int) Math.round(value.asDouble());
        if (value.isTextual()) {
            try {
                return Integer.parseInt(value.asText().replaceAll("[^0-9-]", ""));
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private double readFirstArrayValue(JsonNode node, String fieldName, double fallback) {
        JsonNode value = node.path(fieldName);
        if (value.isArray() && !value.isEmpty() && value.get(0).isNumber()) {
            return value.get(0).asDouble();
        }
        return fallback;
    }

    private String text(JsonNode node, String fieldName, String fallback) {
        JsonNode value = node.path(fieldName);
        if (value.isTextual() && !value.asText().isBlank()) return value.asText();
        return fallback;
    }

    private long secondsSinceTelemetry(IotTelemetryEntity telemetry) {
        if (telemetry.getCreatedAt() == null) return 999_999L;
        return Math.max(0L, Duration.between(telemetry.getCreatedAt(), LocalDateTime.now()).toSeconds());
    }

    private String jsonString(JsonNode node) {
        if (node == null || node.isNull()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }

    private boolean isNumber(Double value) {
        return value != null && !value.isNaN() && !value.isInfinite();
    }

    private double nullSafe(Double value) {
        return value == null ? 0.0 : value;
    }

    private double positive(double value, double fallback) {
        return value > 0.0 && !Double.isNaN(value) && !Double.isInfinite(value) ? value : fallback;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private double clampDouble(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double percent(double value, double capacity) {
        return capacity <= 0.0 ? 0.0 : (value / capacity) * 100.0;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
