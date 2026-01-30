import { weeklyForecastMock } from "../../mock/weeklyForecast.mock";

function iconFor(rainMm: number) {
  if (rainMm >= 15) return "⛈️";
  if (rainMm >= 5) return "🌧️";
  if (rainMm > 0) return "🌦️";
  return "☀️";
}

export default function WeeklyForecastWidget() {
  const data = weeklyForecastMock;

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
            <div className="wx-badge-bottom">Mock data</div>
          </div>
        </div>

        <div className="wx-hero">
          <div className="wx-hero-left">
            <div className="wx-hero-day">{data.days[0].dayLabel}</div>
            <div className="wx-hero-desc">Rainfall outlook</div>
          </div>

          <div className="wx-hero-right">
            <div className="wx-hero-temp">
              {data.days[0].tempMaxC}° / {data.days[0].tempMinC}°
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
                    {d.tempMaxC}° / {d.tempMinC}°
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="wx-footer">
          Tip: We can swap mock data to a real API later without changing the layout.
        </div>
      </div>
    </div>
  );
}
