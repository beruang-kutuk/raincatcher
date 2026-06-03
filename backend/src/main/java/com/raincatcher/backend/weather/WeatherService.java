// package com.raincatcher.backend.weather;

// import com.fasterxml.jackson.core.JsonProcessingException;
// import com.fasterxml.jackson.databind.JsonNode;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.http.client.SimpleClientHttpRequestFactory;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
// import org.springframework.web.client.RestClient;
// import org.springframework.web.client.RestClientException;

// import java.time.Duration;
// import java.time.LocalDateTime;
// import java.util.List;

// @Service
// public class WeatherService {

//     private final WeatherRecordRepository repository;
//     private final ObjectMapper objectMapper;
//     private final RestClient restClient;
//     private final String apiKey;
//     private final String location;
//     private final long cacheMinutes;

//     public WeatherService(
//             WeatherRecordRepository repository,
//             ObjectMapper objectMapper,
//             @Value("${accuweather.api.key:}") String apiKey,
//             @Value("${accuweather.location}") String location,
//             @Value("${accuweather.cache-minutes:30}") long cacheMinutes
//     ) {
//         this.repository = repository;
//         this.objectMapper = objectMapper;
//         this.apiKey = apiKey == null ? "" : apiKey.trim();
//         this.location = location;
//         this.cacheMinutes = cacheMinutes;

//         SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
//         requestFactory.setConnectTimeout(Duration.ofSeconds(5));
//         requestFactory.setReadTimeout(Duration.ofSeconds(10));
//         this.restClient = RestClient.builder()
//                 .baseUrl("http://dataservice.accuweather.com")
//                 .requestFactory(requestFactory)
//                 .build();
//     }

//     @Transactional
//     public WeatherRecordEntity getCurrent() {
//         return getFreshOrFetch("current", this::fetchCurrent);
//     }

//     @Transactional
//     public WeatherRecordEntity getDailyForecast() {
//         return getFreshOrFetch("daily", () -> fetchDaily("daily"));
//     }

//     @Transactional
//     public WeatherRecordEntity getHourlyForecast() {
//         return getFreshOrFetch("hourly", this::fetchHourly);
//     }

//     @Transactional
//     public WeatherRecordEntity getRainfall() {
//         return getFreshOrFetch("rainfall", () -> fetchDaily("rainfall"));
//     }

//     public List<WeatherRecordEntity> getHistory() {
//         return repository.findTop100ByOrderByRecordedAtDesc();
//     }

//     @Transactional
//     public List<java.util.Map<String, Object>> getMultiDayForecast() {
//         WeatherRecordEntity record = getFreshOrFetch("daily", () -> fetchDaily("daily"));
//         java.util.List<java.util.Map<String, Object>> days = new java.util.ArrayList<>();
//         try {
//             if (record.getRawResponseJson() == null || record.getRawResponseJson().isBlank()) {
//                 return days;
//             }
//             JsonNode root = objectMapper.readTree(record.getRawResponseJson());
//             JsonNode forecasts = root.path("DailyForecasts");
//             if (!forecasts.isArray()) return days;
//             for (JsonNode day : forecasts) {
//                 java.util.Map<String, Object> entry = new java.util.LinkedHashMap<>();
//                 entry.put("date", text(day, "Date"));
//                 Double tMin = decimal(day.path("Temperature").path("Minimum").path("Value"));
//                 Double tMax = decimal(day.path("Temperature").path("Maximum").path("Value"));
//                 entry.put("temperatureMin", tMin);
//                 entry.put("temperatureMax", tMax);
//                 entry.put("temperature", tMin == null || tMax == null ? null : (tMin + tMax) / 2.0);
//                 entry.put("rainfallProbability", decimal(day.path("Day").path("RainProbability")));
//                 entry.put("rainfallAmount", decimal(day.path("Day").path("Rain").path("Value")));
//                 entry.put("weatherCondition", text(day.path("Day"), "IconPhrase"));
//                 entry.put("location", record.getLocation());
//                 entry.put("source", "AccuWeather");
//                 days.add(entry);
//             }
//         } catch (Exception ex) {
//             // return whatever we have
//         }
//         return days;
//     }

//     private WeatherRecordEntity getFreshOrFetch(String recordType, WeatherFetcher fetcher) {
//         return repository.findTopByLocationAndRecordTypeOrderByRecordedAtDesc(location, recordType)
//                 .filter(this::isFresh)
//                 .orElseGet(fetcher::fetch);
//     }

//     private boolean isFresh(WeatherRecordEntity record) {
//         if (record.getRecordedAt() == null) {
//             return false;
//         }
//         return record.getRecordedAt().isAfter(LocalDateTime.now().minusMinutes(cacheMinutes));
//     }

//     private WeatherRecordEntity fetchCurrent() {
//         String locationKey = resolveLocationKey();
//         JsonNode response = callCurrent(locationKey);
//         JsonNode current = response.isArray() && !response.isEmpty() ? response.get(0) : response;

//         WeatherRecordEntity record = baseRecord("current", response);
//         record.setTemperature(decimal(current.path("Temperature").path("Metric").path("Value")));
//         record.setHumidity(integer(current.path("RelativeHumidity")));
//         // AccuWeather current conditions uses "PastHour" not "Past1Hour"
//         Double pastHour = decimal(current.path("PrecipitationSummary").path("PastHour").path("Metric").path("Value"));
//         if (pastHour == null) {
//             pastHour = decimal(current.path("PrecipitationSummary").path("Past1Hour").path("Metric").path("Value"));
//         }
//         if (pastHour == null) {
//             pastHour = decimal(current.path("PrecipitationSummary").path("Precipitation").path("Metric").path("Value"));
//         }
//         record.setRainfallAmount(pastHour != null ? pastHour : 0.0);
//         record.setWindSpeed(decimal(current.path("Wind").path("Speed").path("Metric").path("Value")));
//         record.setWeatherCondition(text(current, "WeatherText"));
//         record.setProviderRecordedAt(text(current, "LocalObservationDateTime"));
//         return repository.save(record);
//     }

//     private WeatherRecordEntity fetchDaily(String recordType) {
//         String locationKey = resolveLocationKey();
//         JsonNode response = callDaily(locationKey);
//         JsonNode daily = response.path("DailyForecasts").isArray() && !response.path("DailyForecasts").isEmpty()
//                 ? response.path("DailyForecasts").get(0)
//                 : response;

//         WeatherRecordEntity record = baseRecord(recordType, response);
//         Double min = decimal(daily.path("Temperature").path("Minimum").path("Value"));
//         Double max = decimal(daily.path("Temperature").path("Maximum").path("Value"));
//         record.setTemperature(min == null || max == null ? null : (min + max) / 2.0);
//         record.setRainfallProbability(decimal(daily.path("Day").path("RainProbability")));
//         record.setRainfallAmount(decimal(daily.path("Day").path("Rain").path("Value")));
//         record.setWeatherCondition(text(daily.path("Day"), "IconPhrase"));
//         record.setProviderRecordedAt(text(daily, "Date"));
//         return repository.save(record);
//     }

//     private WeatherRecordEntity fetchHourly() {
//         String locationKey = resolveLocationKey();
//         JsonNode response = callHourly(locationKey);
//         JsonNode hourly = response.isArray() && !response.isEmpty() ? response.get(0) : response;

//         WeatherRecordEntity record = baseRecord("hourly", response);
//         record.setTemperature(decimal(hourly.path("Temperature").path("Value")));
//         record.setHumidity(integer(hourly.path("RelativeHumidity")));
//         record.setRainfallProbability(decimal(hourly.path("RainProbability")));
//         record.setRainfallAmount(decimal(hourly.path("TotalLiquid").path("Value")));
//         record.setWindSpeed(decimal(hourly.path("Wind").path("Speed").path("Value")));
//         record.setWeatherCondition(text(hourly, "IconPhrase"));
//         record.setProviderRecordedAt(text(hourly, "DateTime"));
//         return repository.save(record);
//     }

//     private WeatherRecordEntity baseRecord(String recordType, JsonNode raw) {
//         WeatherRecordEntity record = new WeatherRecordEntity();
//         record.setLocation(location);
//         record.setRecordType(recordType);
//         record.setSource("AccuWeather");
//         record.setRecordedAt(LocalDateTime.now());
//         record.setCreatedAt(LocalDateTime.now());
//         record.setRawResponseJson(jsonString(raw));
//         return record;
//     }

//     private String resolveLocationKey() {
//         requireApiKey();
//         try {
//             JsonNode response = restClient.get()
//                     .uri(uriBuilder -> uriBuilder
//                             .path("/locations/v1/cities/search")
//                             .queryParam("apikey", apiKey)
//                             .queryParam("q", location)
//                             .build())
//                     .retrieve()
//                     .body(JsonNode.class);
//             if (response != null && response.isArray() && !response.isEmpty()) {
//                 String key = text(response.get(0), "Key");
//                 if (key != null) {
//                     return key;
//                 }
//             }
//             throw new WeatherServiceUnavailableException("AccuWeather location not found");
//         } catch (RestClientException ex) {
//             throw new WeatherServiceUnavailableException("AccuWeather location lookup failed", ex);
//         }
//     }

//     private JsonNode callCurrent(String locationKey) {
//         try {
//             return restClient.get()
//                     .uri(uriBuilder -> uriBuilder
//                             .path("/currentconditions/v1/{locationKey}")
//                             .queryParam("apikey", apiKey)
//                             .queryParam("details", true)
//                             .build(locationKey))
//                     .retrieve()
//                     .body(JsonNode.class);
//         } catch (RestClientException ex) {
//             throw new WeatherServiceUnavailableException("AccuWeather current weather request failed", ex);
//         }
//     }

//     private JsonNode callDaily(String locationKey) {
//         try {
//             return restClient.get()
//                     .uri(uriBuilder -> uriBuilder
//                             .path("/forecasts/v1/daily/5day/{locationKey}")
//                             .queryParam("apikey", apiKey)
//                             .queryParam("metric", true)
//                             .queryParam("details", true)
//                             .build(locationKey))
//                     .retrieve()
//                     .body(JsonNode.class);
//         } catch (RestClientException ex) {
//             throw new WeatherServiceUnavailableException("AccuWeather daily forecast request failed", ex);
//         }
//     }

//     private JsonNode callHourly(String locationKey) {
//         try {
//             return restClient.get()
//                     .uri(uriBuilder -> uriBuilder
//                             .path("/forecasts/v1/hourly/12hour/{locationKey}")
//                             .queryParam("apikey", apiKey)
//                             .queryParam("metric", true)
//                             .queryParam("details", true)
//                             .build(locationKey))
//                     .retrieve()
//                     .body(JsonNode.class);
//         } catch (RestClientException ex) {
//             throw new WeatherServiceUnavailableException("AccuWeather hourly forecast request failed", ex);
//         }
//     }

//     private void requireApiKey() {
//         if (apiKey.isBlank()) {
//             throw new WeatherServiceUnavailableException("AccuWeather API key is not configured");
//         }
//     }

//     private Double decimal(JsonNode node) {
//         if (node == null || node.isMissingNode() || node.isNull()) {
//             return null;
//         }
//         if (node.isNumber()) {
//             return node.asDouble();
//         }
//         try {
//             return Double.parseDouble(node.asText());
//         } catch (NumberFormatException ex) {
//             return null;
//         }
//     }

//     private Integer integer(JsonNode node) {
//         if (node == null || node.isMissingNode() || node.isNull()) {
//             return null;
//         }
//         if (node.isInt() || node.isLong()) {
//             return node.asInt();
//         }
//         try {
//             return Integer.parseInt(node.asText());
//         } catch (NumberFormatException ex) {
//             return null;
//         }
//     }

//     private String text(JsonNode node, String fieldName) {
//         if (node == null || node.isMissingNode() || node.isNull()) {
//             return null;
//         }
//         JsonNode value = node.path(fieldName);
//         if (value.isMissingNode() || value.isNull()) {
//             return null;
//         }
//         String text = value.asText();
//         return text.isBlank() ? null : text;
//     }

//     private String jsonString(JsonNode node) {
//         try {
//             return objectMapper.writeValueAsString(node);
//         } catch (JsonProcessingException ex) {
//             return "{}";
//         }
//     }

//     private interface WeatherFetcher {
//         WeatherRecordEntity fetch();
//     }
// }

package com.raincatcher.backend.weather;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class WeatherService {

    private final WeatherRecordRepository repository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String apiKey;
    private final String location;
    private final String configuredLocationKey;
    private final long cacheMinutes;

    public WeatherService(
            WeatherRecordRepository repository,
            ObjectMapper objectMapper,
            @Value("${accuweather.api.key:}") String apiKey,
            @Value("${accuweather.location:Shah Alam, Selangor, Malaysia}") String location,
            @Value("${accuweather.location-key:}") String configuredLocationKey,
            @Value("${accuweather.cache-minutes:30}") long cacheMinutes) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.location = location == null || location.isBlank() ? "Shah Alam, Selangor, Malaysia" : location.trim();
        this.configuredLocationKey = configuredLocationKey == null ? "" : configuredLocationKey.trim();
        this.cacheMinutes = cacheMinutes;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
                .baseUrl("https://dataservice.accuweather.com")
                .requestFactory(requestFactory)
                .build();
    }

    @Transactional
    public WeatherRecordEntity getCurrent() {
        return getFreshOrFetch("current", this::fetchCurrent);
    }

    @Transactional
    public WeatherRecordEntity getDailyForecast() {
        return getFreshOrFetch("daily", () -> fetchDaily("daily"));
    }

    @Transactional
    public WeatherRecordEntity getHourlyForecast() {
        return getFreshOrFetch("hourly", this::fetchHourly);
    }

    @Transactional
    public WeatherRecordEntity getRainfall() {
        return getFreshOrFetch("rainfall", () -> fetchDaily("rainfall"));
    }

    public List<WeatherRecordEntity> getHistory() {
        return repository.findTop100ByOrderByRecordedAtDesc();
    }

    public List<Map<String, Object>> getMultiDayForecast() {
        WeatherRecordEntity record = getDailyForecast();
        List<Map<String, Object>> days = new ArrayList<>();

        try {
            JsonNode raw = objectMapper.readTree(record.getRawResponseJson());
            JsonNode dailyForecasts = raw.path("DailyForecasts");

            if (!dailyForecasts.isArray()) {
                return days;
            }

            for (JsonNode day : dailyForecasts) {
                Double min = decimal(day.path("Temperature").path("Minimum").path("Value"));
                Double max = decimal(day.path("Temperature").path("Maximum").path("Value"));
                Double temperature = min == null || max == null ? null : (min + max) / 2.0;

                Double rainfallAmount = decimal(day.path("Day").path("Rain").path("Value"));
                if (rainfallAmount == null) {
                    rainfallAmount = 0.0;
                }

                Double rainfallProbability = decimal(day.path("Day").path("RainProbability"));
                if (rainfallProbability == null) {
                    rainfallProbability = decimal(day.path("Day").path("PrecipitationProbability"));
                }

                days.add(Map.of(
                        "date", text(day, "Date") == null ? "" : text(day, "Date"),
                        "temperatureMin", min == null ? 0.0 : min,
                        "temperatureMax", max == null ? 0.0 : max,
                        "temperature", temperature == null ? 0.0 : temperature,
                        "rainfallProbability", rainfallProbability == null ? 0.0 : rainfallProbability,
                        "rainfallAmount", rainfallAmount,
                        "weatherCondition",
                        text(day.path("Day"), "IconPhrase") == null ? "" : text(day.path("Day"), "IconPhrase"),
                        "location", location,
                        "source", "AccuWeather"));
            }

            return days;
        } catch (JsonProcessingException ex) {
            throw new WeatherServiceUnavailableException("Unable to parse AccuWeather daily forecast", ex);
        }
    }

    private WeatherRecordEntity getFreshOrFetch(String recordType, WeatherFetcher fetcher) {
        return repository.findTopByLocationAndRecordTypeOrderByRecordedAtDesc(location, recordType)
                .filter(this::isFresh)
                .orElseGet(fetcher::fetch);
    }

    private boolean isFresh(WeatherRecordEntity record) {
        if (record.getRecordedAt() == null) {
            return false;
        }
        return record.getRecordedAt().isAfter(LocalDateTime.now().minusMinutes(cacheMinutes));
    }

    private WeatherRecordEntity fetchCurrent() {
        String locationKey = resolveLocationKey();
        JsonNode response = callCurrent(locationKey);

        if (response == null || response.isNull() || response.isMissingNode()) {
            throw new WeatherServiceUnavailableException("AccuWeather current weather returned no response");
        }

        JsonNode current = response.isArray() && !response.isEmpty() ? response.get(0) : response;

        if (current == null || current.isNull() || current.isMissingNode() || current.isEmpty()) {
            throw new WeatherServiceUnavailableException("AccuWeather current weather returned empty data");
        }

        WeatherRecordEntity record = baseRecord("current", response);
        record.setTemperature(decimal(current.path("Temperature").path("Metric").path("Value")));
        record.setHumidity(integer(current.path("RelativeHumidity")));

        Double rainfall = decimal(current.path("PrecipitationSummary").path("PastHour").path("Metric").path("Value"));
        if (rainfall == null) {
            rainfall = decimal(current.path("PrecipitationSummary").path("Past1Hour").path("Metric").path("Value"));
        }
        if (rainfall == null) {
            rainfall = decimal(current.path("Precip1hr").path("Metric").path("Value"));
        }
        record.setRainfallAmount(rainfall == null ? 0.0 : rainfall);

        Double windSpeed = decimal(current.path("Wind").path("Speed").path("Metric").path("Value"));
        record.setWindSpeed(windSpeed == null ? 0.0 : windSpeed);

        record.setWeatherCondition(text(current, "WeatherText"));
        record.setProviderRecordedAt(text(current, "LocalObservationDateTime"));
        return repository.save(record);
    }

    private WeatherRecordEntity fetchDaily(String recordType) {
        String locationKey = resolveLocationKey();
        JsonNode response = callDaily(locationKey);

        if (response == null || response.isNull() || response.isMissingNode()) {
            throw new WeatherServiceUnavailableException("AccuWeather daily forecast returned no response");
        }

        JsonNode daily = response.path("DailyForecasts").isArray() && !response.path("DailyForecasts").isEmpty()
                ? response.path("DailyForecasts").get(0)
                : response;

        WeatherRecordEntity record = baseRecord(recordType, response);
        Double min = decimal(daily.path("Temperature").path("Minimum").path("Value"));
        Double max = decimal(daily.path("Temperature").path("Maximum").path("Value"));
        record.setTemperature(min == null || max == null ? null : (min + max) / 2.0);

        Double rainfallProbability = decimal(daily.path("Day").path("RainProbability"));
        if (rainfallProbability == null) {
            rainfallProbability = decimal(daily.path("Day").path("PrecipitationProbability"));
        }

        Double rainfallAmount = decimal(daily.path("Day").path("Rain").path("Value"));
        if (rainfallAmount == null) {
            rainfallAmount = 0.0;
        }

        record.setRainfallProbability(rainfallProbability);
        record.setRainfallAmount(rainfallAmount);
        record.setWeatherCondition(text(daily.path("Day"), "IconPhrase"));
        record.setProviderRecordedAt(text(daily, "Date"));
        return repository.save(record);
    }

    private WeatherRecordEntity fetchHourly() {
        String locationKey = resolveLocationKey();
        JsonNode response = callHourly(locationKey);

        if (response == null || response.isNull() || response.isMissingNode()) {
            throw new WeatherServiceUnavailableException("AccuWeather hourly forecast returned no response");
        }

        JsonNode hourly = response.isArray() && !response.isEmpty() ? response.get(0) : response;

        if (hourly == null || hourly.isNull() || hourly.isMissingNode() || hourly.isEmpty()) {
            throw new WeatherServiceUnavailableException("AccuWeather hourly forecast returned empty data");
        }

        WeatherRecordEntity record = baseRecord("hourly", response);
        record.setTemperature(decimal(hourly.path("Temperature").path("Value")));
        record.setHumidity(integer(hourly.path("RelativeHumidity")));
        record.setRainfallProbability(decimal(hourly.path("RainProbability")));

        Double rainfallAmount = decimal(hourly.path("TotalLiquid").path("Value"));
        record.setRainfallAmount(rainfallAmount == null ? 0.0 : rainfallAmount);

        Double windSpeed = decimal(hourly.path("Wind").path("Speed").path("Value"));
        record.setWindSpeed(windSpeed == null ? 0.0 : windSpeed);

        record.setWeatherCondition(text(hourly, "IconPhrase"));
        record.setProviderRecordedAt(text(hourly, "DateTime"));
        return repository.save(record);
    }

    private WeatherRecordEntity baseRecord(String recordType, JsonNode raw) {
        WeatherRecordEntity record = new WeatherRecordEntity();
        record.setLocation(location);
        record.setRecordType(recordType);
        record.setSource("AccuWeather");
        record.setRecordedAt(LocalDateTime.now());
        record.setCreatedAt(LocalDateTime.now());
        record.setRawResponseJson(jsonString(raw));
        return record;
    }

    private String resolveLocationKey() {
        requireApiKey();

        if (!configuredLocationKey.isBlank()) {
            return configuredLocationKey;
        }

        try {
            JsonNode response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/locations/v1/cities/search")
                            .queryParam("apikey", apiKey)
                            .queryParam("q", location)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && response.isArray() && !response.isEmpty()) {
                String key = text(response.get(0), "Key");
                if (key != null && !key.isBlank()) {
                    return key;
                }
            }

            throw new WeatherServiceUnavailableException("AccuWeather location not found");
        } catch (RestClientException ex) {
            throw new WeatherServiceUnavailableException("AccuWeather location lookup failed", ex);
        }
    }

    private JsonNode callCurrent(String locationKey) {
        try {
            JsonNode response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/currentconditions/v1/{locationKey}")
                            .queryParam("apikey", apiKey)
                            .queryParam("details", true)
                            .build(locationKey))
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || response.isNull() || response.isMissingNode()) {
                throw new WeatherServiceUnavailableException("AccuWeather current weather returned null response");
            }

            return response;
        } catch (WeatherServiceUnavailableException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new WeatherServiceUnavailableException("AccuWeather current weather request failed", ex);
        }
    }

    private JsonNode callDaily(String locationKey) {
        try {
            JsonNode response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/forecasts/v1/daily/5day/{locationKey}")
                            .queryParam("apikey", apiKey)
                            .queryParam("metric", true)
                            .queryParam("details", true)
                            .build(locationKey))
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || response.isNull() || response.isMissingNode()) {
                throw new WeatherServiceUnavailableException("AccuWeather daily forecast returned null response");
            }

            return response;
        } catch (WeatherServiceUnavailableException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new WeatherServiceUnavailableException("AccuWeather daily forecast request failed", ex);
        }
    }

    private JsonNode callHourly(String locationKey) {
        try {
            JsonNode response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/forecasts/v1/hourly/12hour/{locationKey}")
                            .queryParam("apikey", apiKey)
                            .queryParam("metric", true)
                            .queryParam("details", true)
                            .build(locationKey))
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || response.isNull() || response.isMissingNode()) {
                throw new WeatherServiceUnavailableException("AccuWeather hourly forecast returned null response");
            }

            return response;
        } catch (WeatherServiceUnavailableException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new WeatherServiceUnavailableException("AccuWeather hourly forecast request failed", ex);
        }
    }

    private void requireApiKey() {
        if (apiKey.isBlank()) {
            throw new WeatherServiceUnavailableException("AccuWeather API key is not configured");
        }
    }

    private Double decimal(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return node.asDouble();
        }
        try {
            return Double.parseDouble(node.asText());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer integer(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isInt() || node.isLong()) {
            return node.asInt();
        }
        try {
            return Integer.parseInt(node.asText());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String text(JsonNode node, String field) {
        if (node == null || node.path(field).isMissingNode() || node.path(field).isNull()) {
            return null;
        }
        String value = node.path(field).asText();
        return value == null || value.isBlank() ? null : value;
    }

    private String jsonString(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }

    @FunctionalInterface
    private interface WeatherFetcher {
        WeatherRecordEntity fetch();
    }
}