export type ForecastDay = {
  dateISO: string;     // YYYY-MM-DD
  dayLabel: string;    // Mon, Tue, ...
  rainMm: number;
  tempMinC: number;
  tempMaxC: number;
};

export type WeeklyForecast = {
  location: string;
  days: ForecastDay[];
};
