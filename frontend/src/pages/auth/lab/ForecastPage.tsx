import { useEffect, useMemo, useState } from "react";
import "../../../styles/dashboard.css";
import "../../../styles/forecast.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";
import {
    getAiRecommendationForecast,
    getTankStorageForecast,
    type AiRecommendationResponse,
    type TankStorageDailyPoint,
    type TankStorageResponse,
} from "../../../services/forecastApi";
import {
    getLatestTelemetry,
    type IotTelemetryReading,
} from "../../../services/iotTelemetryApi";
import {
    getDailyForecastSeries,
    getRainfallWeather,
    type DailyForecastDay,
    type WeatherRecord,
} from "../../../services/weatherApi";
import {
    applyNewBaseline,
    getCalibrationHistory,
    getCalibrationSummary,
    resetCalibration,
    runTankStorageCalibration,
    type CalibrationRecord,
    type CalibrationSummaryResponse,
} from "../../../services/calibrationApi";
import { getEmptyStorageProjection } from "../../../services/forecastPlaceholders";
import { RAINWATER_TANK_NAME } from "../../../services/sensorInputs";
import { formatCurrentDate, formatCurrentDateTime } from "../../../services/time";
import { getAdminForecastSettings } from "../../../services/adminForecastSettingsApi";

const DEFAULT_TANK_CAPACITY_LITRES = 3;
const DEFAULT_CATCHMENT_AREA_M2 = 75;
const DEFAULT_RUNOFF_COEFFICIENT = 0.82;
const DEFAULT_DAILY_USAGE_LITRES = 0.5;

type ForecastMetric = {
    label: string;
    value: string;
    meta?: string;
    status?: "normal" | "warning" | "flagged";
};

type StorageProjectionRow = {
    day: string;
    date: string;
    value: number | null;
    rawValue?: number | null;
};

function getStatusClass(status?: "normal" | "warning" | "flagged") {
    if (status === "warning") return "status-warning";
    if (status === "flagged") return "status-flagged";
    return "status-normal";
}

function ForecastMetricCard({ label, value, meta, status = "normal" }: ForecastMetric) {
    return (
        <div className="forecast-metric-card">
            <p className="forecast-metric-label">{label}</p>
            <h3 className="forecast-metric-value">{value}</h3>
            <div className="forecast-metric-status">
                <span className={`status-pill ${getStatusClass(status)}`}>{status}</span>
            </div>
            {meta && <p className="forecast-metric-meta">{meta}</p>}
        </div>
    );
}

function RainfallForecastChart({ values, labels }: { values: number[]; labels: string[] }) {
    const width = 760;
    const height = 260;
    const paddingLeft = 34;
    const paddingRight = 20;
    const paddingTop = 26;
    const paddingBottom = 40;

    if (values.length < 2) {
        return (
            <div className="forecast-chart-shell">
                <div className="empty-state compact">
                    <strong>No rainfall forecast loaded</strong>
                    <span>Chart data will render from weather forecast input when the backend is connected.</span>
                </div>
            </div>
        );
    }

    const min = 0;
    const max = Math.max(25, ...values);
    const points = values.map((value, index) => {
        const x = paddingLeft + (index * (width - paddingLeft - paddingRight)) / (values.length - 1);
        const y = height - paddingBottom - ((value - min) / (max - min)) * (height - paddingTop - paddingBottom);
        return { x, y };
    });

    const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPoints = [
        `${points[0].x},${height - paddingBottom}`,
        ...points.map((point) => `${point.x},${point.y}`),
        `${points[points.length - 1].x},${height - paddingBottom}`,
    ].join(" ");
    const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];

    return (
        <div className="forecast-chart-shell">
            <svg viewBox={`0 0 ${width} ${height}`} className="forecast-chart-svg" preserveAspectRatio="none">
                {ticks.map((tick) => {
                    const y = height - paddingBottom - ((tick - min) / (max - min)) * (height - paddingTop - paddingBottom);
                    return (
                        <g key={tick}>
                            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} className="forecast-grid-line" />
                            <text x={6} y={y + 4} className="forecast-axis-text">{Math.round(tick)}</text>
                        </g>
                    );
                })}
                <polygon points={areaPoints} className="forecast-area-fill" />
                <polyline points={linePoints} className="forecast-line" />
                {points.map((point, index) => (
                    <circle key={index} cx={point.x} cy={point.y} r="4.5" className="forecast-point" />
                ))}
            </svg>
            <div className="forecast-chart-labels">
                {labels.map((label) => (
                    <div key={label} className="forecast-chart-label"><span>{label}</span></div>
                ))}
            </div>
        </div>
    );
}

function AccuracyMiniChart({ records }: { records: CalibrationRecord[] }) {
    const values = records
        .slice(0, 8)
        .reverse()
        .map((record) => record.accuracyPercent ?? 0);

    if (values.length === 0) {
        return <div className="forecast-mini-empty">No calibration records yet.</div>;
    }

    return (
        <div className="forecast-mini-chart" aria-label="Calibration accuracy over time">
            {values.map((value, index) => (
                <span key={`${value}-${index}`} style={{ height: `${Math.max(8, value)}%` }} title={`${value.toFixed(1)}%`} />
            ))}
        </div>
    );
}

function formatPercent(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "--";
}

function formatNumber(value: number | null | undefined, unit = "") {
    return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}${unit}` : "--";
}

export default function ForecastPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [telemetry, setTelemetry] = useState<IotTelemetryReading | null>(null);
    const [forecastResult, setForecastResult] = useState<TankStorageResponse | null>(null);
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastError, setForecastError] = useState("");
    const [aiResult, setAiResult] = useState<AiRecommendationResponse | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const [rainfallWeather, setRainfallWeather] = useState<WeatherRecord | null>(null);
    const [dailySeries, setDailySeries] = useState<DailyForecastDay[]>([]);
    const [weatherError, setWeatherError] = useState("");
    const [calibrationSummary, setCalibrationSummary] = useState<CalibrationSummaryResponse | null>(null);
    const [calibrationHistory, setCalibrationHistory] = useState<CalibrationRecord[]>([]);
    const [calibrationLoading, setCalibrationLoading] = useState(false);
    const [calibrationAction, setCalibrationAction] = useState<"run" | "reset" | "baseline" | null>(null);
    const [calibrationMessage, setCalibrationMessage] = useState("");
    const [calibrationError, setCalibrationError] = useState("");
    const [forecastSettings, setForecastSettings] = useState({
        tankCapacityLitres: DEFAULT_TANK_CAPACITY_LITRES,
        dailyUsageLitres: DEFAULT_DAILY_USAGE_LITRES,
        catchmentAreaM2: DEFAULT_CATCHMENT_AREA_M2,
        runoffCoefficient: DEFAULT_RUNOFF_COEFFICIENT,
        forecastDays: 7,
    });

    const generatedAt = formatCurrentDateTime();
    const emptyProjection = useMemo<StorageProjectionRow[]>(() => getEmptyStorageProjection(7), []);

    async function loadCalibration() {
        setCalibrationLoading(true);
        setCalibrationError("");
        try {
            const [summary, history] = await Promise.all([
                getCalibrationSummary(),
                getCalibrationHistory(),
            ]);
            setCalibrationSummary(summary);
            setCalibrationHistory(history);
        } catch (error) {
            setCalibrationError(error instanceof Error ? error.message : "Calibration backend unavailable.");
        } finally {
            setCalibrationLoading(false);
        }
    }

    useEffect(() => {
        let active = true;

        getLatestTelemetry()
            .then((reading) => { if (active) setTelemetry(reading); })
            .catch(() => { if (active) setTelemetry(null); });

        getRainfallWeather()
            .then((record) => { if (active) { setRainfallWeather(record); setWeatherError(""); } })
            .catch(() => { if (active) setWeatherError("Weather record unavailable. Check AccuWeather API key."); });

        getDailyForecastSeries()
            .then((series) => { if (active) setDailySeries(series); })
            .catch(() => { /* single rainfall record remains the fallback */ });

        getAdminForecastSettings()
            .then((settings) => {
                if (!active) return;
                const get = (key: string, fallback: number) => {
                    const val = parseFloat(settings.find((s) => s.settingKey === key)?.value ?? "");
                    return Number.isFinite(val) && val > 0 ? val : fallback;
                };
                setForecastSettings({
                    tankCapacityLitres: get("tank_capacity_litres", DEFAULT_TANK_CAPACITY_LITRES),
                    dailyUsageLitres: get("daily_usage_litres", DEFAULT_DAILY_USAGE_LITRES),
                    catchmentAreaM2: get("catchment_area_m2", DEFAULT_CATCHMENT_AREA_M2),
                    runoffCoefficient: get("runoff_coefficient", DEFAULT_RUNOFF_COEFFICIENT),
                    forecastDays: get("forecast_days", 7),
                });
            })
            .catch(() => { /* keep defaults — admin API might not be authenticated */ });

        void loadCalibration();

        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!telemetry) return;
        let active = true;

        const { tankCapacityLitres, dailyUsageLitres, catchmentAreaM2, runoffCoefficient, forecastDays } = forecastSettings;
        const currentVolumeLitres = (telemetry.waterLevelPercent / 100) * tankCapacityLitres;
        const dailyRainfall = dailySeries.length > 0
            ? dailySeries.slice(0, 7).map((day) => typeof day.rainfallAmount === "number" ? day.rainfallAmount : 0)
            : [typeof rainfallWeather?.rainfallAmount === "number" ? rainfallWeather.rainfallAmount : 0];

        setForecastLoading(true);
        setForecastError("");
        getTankStorageForecast({
            currentTankVolumeLitres: currentVolumeLitres,
            tankCapacityLitres,
            dailyUsageLitres,
            catchmentAreaM2,
            runoffCoefficient,
            forecastDays,
            dailyRainfallMm: dailyRainfall,
        })
            .then((result) => { if (active) setForecastResult(result); })
            .catch((error: unknown) => {
                if (!active) return;
                setForecastError(error instanceof Error ? error.message : "Forecast backend unavailable.");
            })
            .finally(() => { if (active) setForecastLoading(false); });

        setAiLoading(true);
        setAiError("");
        getAiRecommendationForecast()
            .then((result) => { if (active) setAiResult(result); })
            .catch((error: unknown) => {
                if (!active) return;
                setAiError(error instanceof Error ? error.message : "AI recommendation unavailable.");
            })
            .finally(() => { if (active) setAiLoading(false); });

        return () => { active = false; };
    }, [telemetry, rainfallWeather, dailySeries, forecastSettings]);

    const rainfallTrend = useMemo(() => {
        if (forecastResult?.dailyProjection.length) return forecastResult.dailyProjection.map((point) => point.rainfallMm);
        if (dailySeries.length >= 2) return dailySeries.map((day) => typeof day.rainfallAmount === "number" ? day.rainfallAmount : 0);
        return [];
    }, [forecastResult, dailySeries]);

    const storageProjection = useMemo<StorageProjectionRow[]>(() => {
        if (!forecastResult) return emptyProjection;
        const offset = forecastResult.calibrationApplied ? forecastResult.calibrationOffset ?? 0 : 0;
        return forecastResult.dailyProjection.map((point: TankStorageDailyPoint, index) => ({
            day: `Day ${point.day}`,
            date: emptyProjection[index]?.date ?? `Day ${point.day}`,
            value: Math.max(0, Math.min(100, point.levelPercent + offset)),
            rawValue: point.levelPercent,
        }));
    }, [forecastResult, emptyProjection]);

    const rainfallLabels = storageProjection.map((item) => item.date);
    const weatherAvailable = rainfallWeather !== null || dailySeries.length > 0;
    const totalRainfall = dailySeries.length > 0
        ? dailySeries.reduce((sum, day) => sum + (typeof day.rainfallAmount === "number" ? day.rainfallAmount : 0), 0)
        : typeof rainfallWeather?.rainfallAmount === "number" ? rainfallWeather.rainfallAmount : null;
    const usableWaterLitres = telemetry ? (telemetry.waterLevelPercent / 100) * forecastSettings.tankCapacityLitres : null;
    const confidence = calibrationSummary?.calibrationAccuracy
        ?? forecastResult?.calibrationAccuracyPercent
        ?? (forecastResult ? Math.max(65, 100 - forecastResult.shortageDays * 8 - forecastResult.overflowDays * 6) : null);

    const forecastMetrics: ForecastMetric[] = [
        {
            label: "Current Tank Level",
            value: telemetry ? formatPercent(telemetry.waterLevelPercent) : "--",
            meta: telemetry ? "Latest ESP32 ultrasonic reading" : "Waiting for actual telemetry reading.",
            status: telemetry ? "normal" : "warning",
        },
        {
            label: "Expected Rainfall",
            value: totalRainfall != null ? `${totalRainfall.toFixed(1)} mm` : "0.0 mm",
            meta: weatherAvailable ? (dailySeries.length > 0 ? `${dailySeries.length}-day AccuWeather forecast` : "Latest rainfall record") : (weatherError || "Weather unavailable"),
            status: weatherAvailable ? "normal" : "warning",
        },
        {
            label: "Usable Water",
            value: usableWaterLitres != null ? `${usableWaterLitres.toFixed(2)} L` : "--",
            meta: "Estimated from current tank level and capacity",
            status: telemetry ? "normal" : "warning",
        },
        {
            label: "Forecast Confidence",
            value: formatPercent(confidence),
            meta: calibrationSummary?.recommendation ?? "Improves after calibration history is available.",
            status: confidence == null ? "warning" : confidence >= 85 ? "normal" : "warning",
        },
    ];

    async function handleRunCalibration() {
        setCalibrationAction("run");
        setCalibrationMessage("");
        setCalibrationError("");
        try {
            const predictedValue = forecastResult?.calibratedForecastLevel ?? forecastResult?.finalLevelPercent;
            const actualValue = telemetry?.waterLevelPercent;
            const result = await runTankStorageCalibration({
                module: "tank_storage",
                predictedValue,
                actualValue,
            });
            if (result.status === "blocked") {
                setCalibrationError(result.message || "Waiting for actual telemetry reading.");
            } else {
                setCalibrationMessage(result.message || "Calibration completed.");
            }
            await loadCalibration();
        } catch (error) {
            setCalibrationError(error instanceof Error ? error.message : "Calibration could not run.");
        } finally {
            setCalibrationAction(null);
        }
    }

    async function handleResetCalibration() {
        setCalibrationAction("reset");
        setCalibrationMessage("");
        setCalibrationError("");
        try {
            const result = await resetCalibration();
            setCalibrationMessage(result.message);
            await loadCalibration();
        } catch (error) {
            setCalibrationError(error instanceof Error ? error.message : "Calibration reset failed.");
        } finally {
            setCalibrationAction(null);
        }
    }

    async function handleApplyBaseline() {
        setCalibrationAction("baseline");
        setCalibrationMessage("");
        setCalibrationError("");
        try {
            const result = await applyNewBaseline();
            setCalibrationMessage(result.message);
            await loadCalibration();
        } catch (error) {
            setCalibrationError(error instanceof Error ? error.message : "Baseline could not be applied.");
        } finally {
            setCalibrationAction(null);
        }
    }

    const latestHistory = calibrationHistory[0];
    const recommendations = calibrationSummary?.recommendations?.length
        ? calibrationSummary.recommendations
        : [
            "pH sensor slightly drifting",
            "Turbidity calibration stable",
            "Forecast confidence improved after latest calibration",
        ];

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="forecast-page page-container">
                        <div className="forecast-topbar">
                            <div>
                                <h1 className="forecast-page-title">Forecast</h1>
                            </div>
                            <div className="forecast-topbar-right">
                                <button className="forecast-filter-btn" type="button">{formatCurrentDate()}</button>
                                <button className="forecast-filter-btn" type="button">{RAINWATER_TANK_NAME}</button>
                                <div className="dashboard-actions"><ProfileMenu /></div>
                            </div>
                        </div>

                        <section className="forecast-unified-section">
                            <div className="forecast-section-heading">
                                <div>
                                    <span className="forecast-section-kicker">Prediction Reliability</span>
                                    <h2>Forecast &amp; ML Calibration</h2>
                                    <p>Forecast outputs and ML calibration health are monitored together to improve prediction reliability.</p>
                                </div>
                                <span className={`status-pill ${getStatusClass(calibrationSummary?.modelStatus === "Calibrated" ? "normal" : "warning")}`}>
                                    {calibrationSummary?.modelStatus ?? "Pending"}
                                </span>
                            </div>

                            <div className="forecast-metric-grid forecast-unified-metrics">
                                {forecastMetrics.map((item) => <ForecastMetricCard key={item.label} {...item} />)}
                            </div>

                            <div className="forecast-main-grid">
                                <div className="forecast-left-column">
                                    <section className="forecast-panel forecast-chart-panel">
                                        <div className="forecast-panel-header forecast-panel-header-split">
                                            <div><h2>7-Day Rainfall Forecast</h2></div>
                                            <button className="forecast-filter-btn small" type="button">
                                                {weatherAvailable ? "AccuWeather Shah Alam" : "Weather unavailable"}
                                            </button>
                                        </div>
                                        <div className="forecast-legend">
                                            <div className="forecast-legend-item">
                                                <span className="forecast-legend-dot forecast-legend-dot-line" />
                                                <span>Predicted rainfall (mm)</span>
                                            </div>
                                        </div>
                                        <RainfallForecastChart values={rainfallTrend} labels={rainfallLabels} />
                                        <div className="forecast-info-note">
                                            Generated: {generatedAt}. {weatherAvailable ? "Weather input loaded from backend." : weatherError || "Awaiting weather input."}
                                        </div>
                                    </section>

                                    <section className="forecast-panel">
                                        <div className="forecast-panel-header">
                                            <h2>Tank Storage Projection</h2>
                                        </div>

                                        {forecastLoading && <p className="forecast-state-message">Loading forecast service results...</p>}
                                        {forecastError && !forecastLoading && <p className="forecast-state-message error">{forecastError}</p>}

                                        <div className="forecast-storage-list">
                                            {storageProjection.map((item) => (
                                                <div key={`${item.day}-${item.date}`} className="forecast-storage-row">
                                                    <div className="forecast-storage-day">{item.day}</div>
                                                    <div className="forecast-storage-date">{item.date}</div>
                                                    <div className="forecast-storage-progress">
                                                        <div className="forecast-storage-progress-fill" style={{ width: `${item.value ?? 0}%` }} />
                                                    </div>
                                                    <div className="forecast-storage-value">{item.value === null ? "--" : `${item.value.toFixed(1)}%`}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="forecast-calibrated-strip">
                                            <div>
                                                <span>Raw forecast</span>
                                                <strong>{formatPercent(forecastResult?.rawForecastLevel ?? forecastResult?.finalLevelPercent)}</strong>
                                            </div>
                                            <div>
                                                <span>Calibrated forecast</span>
                                                <strong>{formatPercent(forecastResult?.calibratedForecastLevel)}</strong>
                                            </div>
                                            <div>
                                                <span>Calibration status</span>
                                                <strong>{forecastResult?.calibrationApplied ? "Applied" : "Pending"}</strong>
                                            </div>
                                            <div>
                                                <span>Accuracy</span>
                                                <strong>{formatPercent(forecastResult?.calibrationAccuracyPercent ?? calibrationSummary?.calibrationAccuracy)}</strong>
                                            </div>
                                        </div>

                                        {forecastResult && (
                                            <div className="forecast-info-note compact">
                                                Overflow days: {forecastResult.overflowDays} | Shortage days: {forecastResult.shortageDays}. {forecastResult.recommendation}
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <aside className="forecast-side-column">
                                    <section className="forecast-panel">
                                        <div className="forecast-panel-header">
                                            <h2>ML Calibration Health</h2>
                                        </div>

                                        <div className="forecast-health-grid">
                                            <div><span>Model Status</span><strong>{calibrationSummary?.modelStatus ?? "Pending"}</strong></div>
                                            <div><span>Last Calibration</span><strong>{calibrationSummary?.lastCalibrationAt ?? "No calibration records yet."}</strong></div>
                                            <div><span>Sensor Drift</span><strong>{formatNumber(calibrationSummary?.sensorDrift, "%")}</strong></div>
                                            <div><span>Calibration Accuracy</span><strong>{formatPercent(calibrationSummary?.calibrationAccuracy)}</strong></div>
                                            <div><span>Next Recommended</span><strong>{calibrationSummary?.nextRecommendedCalibration ?? "After first calibration"}</strong></div>
                                        </div>

                                        <div className="forecast-mini-chart-wrap">
                                            <span>Accuracy over time</span>
                                            <AccuracyMiniChart records={calibrationHistory} />
                                        </div>

                                        <div className="forecast-action-row">
                                            <button className="forecast-primary-btn" type="button" onClick={handleRunCalibration} disabled={calibrationAction !== null || !telemetry}>
                                                {calibrationAction === "run" ? "Running..." : "Run Calibration"}
                                            </button>
                                            <button className="forecast-secondary-btn" type="button" onClick={handleApplyBaseline} disabled={calibrationAction !== null || calibrationHistory.length === 0}>
                                                {calibrationAction === "baseline" ? "Applying..." : "Apply New Baseline"}
                                            </button>
                                            <button className="forecast-secondary-btn" type="button" onClick={handleResetCalibration} disabled={calibrationAction !== null || calibrationHistory.length === 0}>
                                                {calibrationAction === "reset" ? "Resetting..." : "Reset Calibration"}
                                            </button>
                                        </div>

                                        <div className="forecast-feedback" aria-live="polite">
                                            {calibrationLoading && <span>Loading calibration...</span>}
                                            {!calibrationLoading && calibrationMessage && <span className="success">{calibrationMessage}</span>}
                                            {!calibrationLoading && calibrationError && <span className="error">{calibrationError}</span>}
                                            {!calibrationLoading && !calibrationMessage && !calibrationError && !telemetry && <span>Waiting for actual telemetry reading.</span>}
                                            {!calibrationLoading && !calibrationMessage && !calibrationError && calibrationHistory.length === 0 && telemetry && <span>No calibration records yet.</span>}
                                        </div>
                                    </section>

                                    <section className="forecast-panel">
                                        <div className="forecast-panel-header">
                                            <h2>ML Recommendations</h2>
                                        </div>
                                        <div className="forecast-recommendation-list">
                                            {recommendations.map((recommendation) => (
                                                <div key={recommendation} className="forecast-recommendation-item">
                                                    <div>
                                                        <h3>{recommendation}</h3>
                                                        <p>{latestHistory?.recommendation ?? aiResult?.recommendation ?? "Recommendation will update as calibration history grows."}</p>
                                                    </div>
                                                    <span className="forecast-arrow">ML</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="forecast-info-note compact">
                                            {aiLoading ? "Generating backend AI recommendation..." : aiError || aiResult?.recommendation || "Waiting for backend AI recommendation."}
                                        </div>
                                    </section>
                                </aside>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
