import { useEffect, useState } from "react";
import { getCurrentWeather, getDailyWeatherForecast, type WeatherRecord } from "../../services/weatherApi";

function iconFor(condition: string | null | undefined, rainMm: number | null | undefined) {
  const text = condition?.toLowerCase() ?? "";
  if (text.includes("storm")) return "⛈";
  if (text.includes("rain") || (typeof rainMm === "number" && rainMm >= 5)) return "🌧";
  if (typeof rainMm === "number" && rainMm > 0) return "🌦";
  if (text.includes("cloud")) return "☁";
  if (text.includes("sunny") || text.includes("clear")) return "☀";
  return "🌤";
}

function fmtTemp(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)} °C`;
}

function fmtRainfall(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0.0 mm";
  return `${value.toFixed(1)} mm`;
}

function fmtWind(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Unavailable";
  return `${value.toFixed(1)} km/h`;
}

function fmtNum(value: number | null | undefined, unit: string, decimals = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return `-- ${unit}`;
  return `${value.toFixed(decimals)} ${unit}`;
}

export default function WeeklyForecastWidget() {
  const [current, setCurrent] = useState<WeatherRecord | null>(null);
  const [daily, setDaily] = useState<WeatherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([getCurrentWeather(), getDailyWeatherForecast()])
      .then(([currentResult, dailyResult]) => {
        if (!active) return;
        if (currentResult.status === "fulfilled") setCurrent(currentResult.value);
        if (dailyResult.status === "fulfilled") setDaily(dailyResult.value);
        if (currentResult.status === "rejected" && dailyResult.status === "rejected") {
          const msg = (currentResult.reason as Error)?.message ?? "";
          setError(msg.includes("API key") ? "AccuWeather API key not configured on Raspberry Pi backend." : "Weather service unavailable");
        } else {
          setError("");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const display = current ?? daily;
  const condition = display?.weatherCondition ?? "Awaiting weather";
  const rainMm = display?.rainfallAmount ?? null;
  const rainProb = daily?.rainfallProbability ?? null;
  const location = display?.location ?? "Shah Alam";
  const lastUpdated = display?.recordedAt ?? display?.providerRecordedAt ?? "--";
  const source = display?.source ?? "AccuWeather";

  return (
    <div className="wx">
      <div className="wx-inner">
        <div className="wx-header">
          <div>
            <div className="wx-title">Weather Forecast</div>
            <div className="wx-subtitle">{location}</div>
          </div>
          <div className="wx-badge">
            <div className="wx-badge-top">{source}</div>
            <div className="wx-badge-bottom">{loading ? "Loading" : error ? "Unavailable" : "Live"}</div>
          </div>
        </div>

        {error ? (
          <div className="wx-hero">
            <div className="wx-hero-left">
              <div className="wx-hero-day">weather</div>
              <div className="wx-hero-desc" style={{ fontSize: "13px", opacity: 0.8 }}>{error}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="wx-hero">
              <div className="wx-hero-left">
                <div className="wx-hero-day" style={{ fontSize: "22px" }}>{iconFor(condition, rainMm)}</div>
                <div className="wx-hero-desc">{condition}</div>
              </div>
              <div className="wx-hero-right">
                <div className="wx-hero-temp">{fmtTemp(display?.temperature)}</div>
                <div className="wx-hero-rain">{fmtRainfall(rainMm)}</div>
              </div>
            </div>

            <div className="wx-grid">
              {(
                [
                  ["Rain", fmtRainfall(rainMm), "🌧"],
                  ["Rain prob.", rainProb != null ? `${rainProb.toFixed(0)}%` : "--", "☔"],
                  ["Humidity", fmtNum(current?.humidity ?? display?.humidity, "%"), "💧"],
                  ["Wind", fmtWind(current?.windSpeed ?? display?.windSpeed), "💨"],
                ] as [string, string, string][]
              ).map(([label, value, icon]) => (
                <div className="wx-card" key={label}>
                  <div className="wx-card-top">
                    <div className="wx-day">{label}</div>
                    <div className="wx-icon" aria-hidden>{icon}</div>
                  </div>
                  <div className="wx-card-value">{value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="wx-footer">
          {error ? "Check ACCUWEATHER_API_KEY on Raspberry Pi" : `${source} · Updated ${lastUpdated}`}
        </div>
      </div>
    </div>
  );
}
