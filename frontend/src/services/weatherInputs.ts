import type { WeeklyForecast } from "../types/weather";

function buildPlaceholderDays(): WeeklyForecast["days"] {
    const today = new Date();

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() + index);

        return {
            dateISO: date.toISOString().slice(0, 10),
            dayLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
            rainMm: 0,
            tempMinC: 0,
            tempMaxC: 0,
        };
    });
}

export const weatherInputPlaceholder: WeeklyForecast = {
    location: "Pilot Site - Campus",
    days: buildPlaceholderDays(),
};

