import { weatherInputPlaceholder } from "../../services/weatherInputs";

function iconFor(rainMm: number) {
  if (rainMm >= 15) return "Storm";
  if (rainMm >= 5) return "Rain";
  if (rainMm > 0) return "Drizzle";
  return "Dry";
}

export default function WeeklyForecastWidget() {
  const data = weatherInputPlaceholder;

  return (
    <div className="wx">
      <div className="wx-inner">
        <div className="wx-header">
          <div>
            <div className="wx-title">Weekly Forecast</div>
            <div className="wx-subtitle">{data.location}</div>
          </div>

          <div className="wx-badge">
            <div className="wx-badge-top">Next 7 days</div>
            <div className="wx-badge-bottom">API pending</div>
          </div>
        </div>

        <div className="wx-hero">
          <div className="wx-hero-left">
            <div className="wx-hero-day">{data.days[0].dayLabel}</div>
            <div className="wx-hero-desc">Rainfall outlook</div>
          </div>

          <div className="wx-hero-right">
            <div className="wx-hero-temp">
              {data.days[0].tempMaxC} deg / {data.days[0].tempMinC} deg
            </div>
            <div className="wx-hero-rain">{data.days[0].rainMm} mm</div>
          </div>
        </div>

        <div className="wx-grid">
          {data.days.map((d) => (
            <div className="wx-card" key={d.dateISO}>
              <div className="wx-card-top">
                <div className="wx-day">{d.dayLabel}</div>
                <div className="wx-icon" aria-hidden>
                  {iconFor(d.rainMm)}
                </div>
              </div>

              <div className="wx-metrics">
                <div className="wx-metric">
                  <span className="wx-k">Rain</span>
                  <span className="wx-v">{d.rainMm} mm</span>
                </div>
                <div className="wx-metric">
                  <span className="wx-k">Temp</span>
                  <span className="wx-v">
                    {d.tempMaxC} deg / {d.tempMinC} deg
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="wx-footer">
          Weather slots are ready for the AccuWeather API connection.
        </div>
      </div>
    </div>
  );
}

