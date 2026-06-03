import { buildBackendUrl } from "./apiConfig";

export type WeatherRecord = {
    id?: number;
    location: string;
    recordType: string;
    temperature?: number | null;
    humidity?: number | null;
    rainfallProbability?: number | null;
    rainfallAmount?: number | null;
    windSpeed?: number | null;
    weatherCondition?: string | null;
    source?: string | null;
    providerRecordedAt?: string | null;
    recordedAt?: string | null;
    createdAt?: string | null;
};

export type DailyForecastDay = {
    date?: string | null;
    temperature?: number | null;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    rainfallAmount?: number | null;
    rainfallProbability?: number | null;
    weatherCondition?: string | null;
    location?: string | null;
    source?: string | null;
};

async function fetchWeather(path: string): Promise<WeatherRecord> {
    const response = await fetch(buildBackendUrl(path));
    if (!response.ok) {
        throw new Error(`Weather request failed with status ${response.status}`);
    }
    return (await response.json()) as WeatherRecord;
}

export function getCurrentWeather() {
    return fetchWeather("/api/weather/current");
}

export function getDailyWeatherForecast() {
    return fetchWeather("/api/weather/forecast/daily");
}

export function getHourlyWeatherForecast() {
    return fetchWeather("/api/weather/forecast/hourly");
}

export function getRainfallWeather() {
    return fetchWeather("/api/weather/rainfall");
}

export async function getDailyForecastSeries(): Promise<DailyForecastDay[]> {
    const response = await fetch(buildBackendUrl("/api/weather/forecast/daily/multi"));
    if (!response.ok) {
        throw new Error(`Weather multi-day request failed with status ${response.status}`);
    }
    return (await response.json()) as DailyForecastDay[];
}
