import type { WeeklyForecast } from "../types/weather";

export const weeklyForecastMock: WeeklyForecast = {
  location: "Pilot Site — Campus",
  days: [
    { dateISO: "2026-01-30", dayLabel: "Fri", rainMm: 2, tempMinC: 24, tempMaxC: 31 },
    { dateISO: "2026-01-31", dayLabel: "Sat", rainMm: 18, tempMinC: 24, tempMaxC: 29 },
    { dateISO: "2026-02-01", dayLabel: "Sun", rainMm: 7, tempMinC: 24, tempMaxC: 30 },
    { dateISO: "2026-02-02", dayLabel: "Mon", rainMm: 0, tempMinC: 23, tempMaxC: 32 },
    { dateISO: "2026-02-03", dayLabel: "Tue", rainMm: 4, tempMinC: 24, tempMaxC: 31 },
    { dateISO: "2026-02-04", dayLabel: "Wed", rainMm: 12, tempMinC: 24, tempMaxC: 30 },
    { dateISO: "2026-02-05", dayLabel: "Thu", rainMm: 22, tempMinC: 24, tempMaxC: 29 },
  ],
};
