package com.raincatcher.backend.calibration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.raincatcher.backend.forecast.ForecastRunEntity;
import com.raincatcher.backend.forecast.ForecastRunRepository;
import com.raincatcher.backend.iot.IotTelemetryEntity;
import com.raincatcher.backend.iot.IotTelemetryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CalibrationService {

    public static final String TANK_STORAGE_MODULE = "tank_storage";

    private final CalibrationRecordRepository repository;
    private final IotTelemetryRepository telemetryRepository;
    private final ForecastRunRepository forecastRunRepository;
    private final ObjectMapper objectMapper;

    public CalibrationService(
            CalibrationRecordRepository repository,
            IotTelemetryRepository telemetryRepository,
            ForecastRunRepository forecastRunRepository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.telemetryRepository = telemetryRepository;
        this.forecastRunRepository = forecastRunRepository;
        this.objectMapper = objectMapper;
    }

    public CalibrationSummaryResponse summary() {
        Optional<CalibrationRecordEntity> latest = repository.findTopByModuleOrderByCreatedAtDesc(TANK_STORAGE_MODULE);
        long count = repository.count();
        boolean telemetryAvailable = latestTelemetryValue().isPresent();

        if (latest.isEmpty()) {
            return new CalibrationSummaryResponse(
                    telemetryAvailable ? "Pending" : "Needs Calibration",
                    null,
                    null,
                    null,
                    0.0,
                    null,
                    null,
                    telemetryAvailable
                            ? "Waiting for a forecast calibration run."
                            : "Waiting for actual telemetry reading.",
                    count,
                    telemetryAvailable,
                    telemetryAvailable ? "Ready to run calibration." : "Waiting for actual telemetry reading.",
                    List.of(
                            "pH sensor slightly drifting",
                            "Turbidity calibration stable",
                            "Forecast confidence will improve after the first calibration"
                    )
            );
        }

        CalibrationRecordEntity record = latest.get();
        String status = record.getAccuracyPercent() != null && record.getAccuracyPercent() >= 90.0
                ? "Calibrated"
                : record.getAccuracyPercent() != null && record.getAccuracyPercent() >= 75.0
                ? "Pending"
                : "Needs Calibration";
        LocalDateTime next = record.getCreatedAt() == null ? null : record.getCreatedAt().plusDays(7);

        return new CalibrationSummaryResponse(
                status,
                record.getCreatedAt(),
                round(record.getErrorValue()),
                round(record.getAccuracyPercent()),
                round(record.getCalibrationOffset()),
                round(record.getCalibratedValue()),
                next,
                record.getRecommendation(),
                count,
                telemetryAvailable,
                telemetryAvailable ? "Calibration summary loaded." : "Waiting for actual telemetry reading.",
                List.of(
                        Math.abs(value(record.getErrorValue())) > 5.0
                                ? "pH sensor slightly drifting"
                                : "pH sensor drift is within the expected range",
                        "Turbidity calibration stable",
                        "Forecast confidence improved after latest calibration"
                )
        );
    }

    public List<CalibrationRecordEntity> history() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional
    public CalibrationResponse runTankStorageCalibration(CalibrationRequest request) {
        String module = normaliseModule(request == null ? null : request.module());
        Double predictedValue = request == null ? null : request.predictedValue();
        Double actualValue = request == null ? null : request.actualValue();

        if (!isNumber(actualValue)) {
            actualValue = latestTelemetryValue().orElse(null);
        }
        if (!isNumber(predictedValue)) {
            predictedValue = latestForecastValue().orElse(null);
        }

        if (!isNumber(actualValue)) {
            return blocked(module, "Waiting for actual telemetry reading.");
        }
        if (!isNumber(predictedValue)) {
            return blocked(module, "Waiting for tank storage forecast output.");
        }

        double error = actualValue - predictedValue;
        double absolute = Math.abs(error);
        double accuracy = Math.max(0.0, 100.0 - absolute);
        double offset = recentAverageError(module, error);
        double calibrated = predictedValue + offset;
        String recommendation = recommendation(error, absolute);

        CalibrationRecordEntity entity = new CalibrationRecordEntity();
        entity.setModule(module);
        entity.setPredictedValue(round(predictedValue));
        entity.setActualValue(round(actualValue));
        entity.setErrorValue(round(error));
        entity.setAbsoluteError(round(absolute));
        entity.setAccuracyPercent(round(accuracy));
        entity.setCalibrationOffset(round(offset));
        entity.setCalibratedValue(round(calibrated));
        entity.setRecommendation(recommendation);
        entity.setCreatedAt(LocalDateTime.now());

        return toResponse("completed", "Calibration completed.", repository.save(entity));
    }

    @Transactional
    public CalibrationResponse reset() {
        repository.deleteAll();
        return new CalibrationResponse(
                "completed",
                "Calibration records reset.",
                TANK_STORAGE_MODULE,
                null,
                null,
                null,
                null,
                null,
                0.0,
                null,
                "Calibration baseline has been cleared.",
                LocalDateTime.now()
        );
    }

    public CalibrationResponse applyNewBaseline() {
        return repository.findTopByModuleOrderByCreatedAtDesc(TANK_STORAGE_MODULE)
                .map((record) -> new CalibrationResponse(
                        "completed",
                        "Latest calibration baseline is ready for tank storage forecasts.",
                        record.getModule(),
                        record.getPredictedValue(),
                        record.getActualValue(),
                        record.getErrorValue(),
                        record.getAbsoluteError(),
                        record.getAccuracyPercent(),
                        record.getCalibrationOffset(),
                        record.getCalibratedValue(),
                        record.getRecommendation(),
                        record.getCreatedAt()
                ))
                .orElseGet(() -> new CalibrationResponse(
                        "empty",
                        "No calibration records yet.",
                        TANK_STORAGE_MODULE,
                        null,
                        null,
                        null,
                        null,
                        null,
                        0.0,
                        null,
                        "Run calibration before applying a new baseline.",
                        LocalDateTime.now()
                ));
    }

    private Optional<Double> latestTelemetryValue() {
        return telemetryRepository.findTopByOrderByIdDesc()
                .map(IotTelemetryEntity::getWaterLevelPercent)
                .filter(this::isNumber);
    }

    private Optional<Double> latestForecastValue() {
        return forecastRunRepository.findTopByModuleAndStatusOrderByCreatedAtDesc("tank-storage", "completed")
                .map(ForecastRunEntity::getResultJson)
                .flatMap(this::readForecastLevel);
    }

    private Optional<Double> readForecastLevel(String json) {
        if (json == null || json.isBlank()) return Optional.empty();
        try {
            JsonNode node = objectMapper.readTree(json);
            JsonNode calibrated = node.path("calibratedForecastLevel");
            if (calibrated.isNumber()) return Optional.of(calibrated.asDouble());
            JsonNode finalLevel = node.path("finalLevelPercent");
            if (finalLevel.isNumber()) return Optional.of(finalLevel.asDouble());
        } catch (Exception ignored) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    private double recentAverageError(String module, double currentError) {
        List<CalibrationRecordEntity> records = repository.findTop10ByModuleOrderByCreatedAtDesc(module);
        if (records.isEmpty()) return currentError;
        double total = currentError;
        int count = 1;
        for (CalibrationRecordEntity record : records) {
            if (isNumber(record.getErrorValue())) {
                total += record.getErrorValue();
                count++;
            }
        }
        return total / count;
    }

    private String recommendation(double error, double absolute) {
        if (absolute <= 2.0) {
            return "Model calibration is stable. Forecast output closely matches telemetry.";
        }
        if (error < 0.0) {
            return "Model is slightly overestimating tank storage. Future forecasts are being adjusted downward.";
        }
        return "Model is slightly underestimating tank storage. Future forecasts are being adjusted upward.";
    }

    private CalibrationResponse blocked(String module, String message) {
        return new CalibrationResponse(
                "blocked",
                message,
                module,
                null,
                null,
                null,
                null,
                null,
                latestOffset(module),
                null,
                message,
                LocalDateTime.now()
        );
    }

    private Double latestOffset(String module) {
        return repository.findTopByModuleOrderByCreatedAtDesc(module)
                .map(CalibrationRecordEntity::getCalibrationOffset)
                .orElse(0.0);
    }

    private CalibrationResponse toResponse(String status, String message, CalibrationRecordEntity entity) {
        return new CalibrationResponse(
                status,
                message,
                entity.getModule(),
                entity.getPredictedValue(),
                entity.getActualValue(),
                entity.getErrorValue(),
                entity.getAbsoluteError(),
                entity.getAccuracyPercent(),
                entity.getCalibrationOffset(),
                entity.getCalibratedValue(),
                entity.getRecommendation(),
                entity.getCreatedAt()
        );
    }

    private String normaliseModule(String module) {
        if (module == null || module.isBlank()) return TANK_STORAGE_MODULE;
        return module.trim().replace("-", "_");
    }

    private boolean isNumber(Double value) {
        return value != null && !value.isNaN() && !value.isInfinite();
    }

    private double value(Double number) {
        return number == null ? 0.0 : number;
    }

    private Double round(Double value) {
        if (value == null) return null;
        return Math.round(value * 10.0) / 10.0;
    }
}
