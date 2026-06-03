package com.raincatcher.backend.admin.forecastsettings;

import java.util.Map;

public record AdminForecastSettingsRequest(
        Map<String, String> values
) {
}
