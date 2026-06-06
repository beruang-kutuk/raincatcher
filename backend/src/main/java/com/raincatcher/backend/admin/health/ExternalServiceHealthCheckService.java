package com.raincatcher.backend.admin.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URL;

@Service
public class ExternalServiceHealthCheckService {

    private final String cameraBaseUrl;
    private final String mlBaseUrl;

    public ExternalServiceHealthCheckService(
            @Value("${camera.rpi.base-url:}") String cameraBaseUrl,
            @Value("${ml.service.base-url:http://192.168.100.137:5051}") String mlBaseUrl
    ) {
        this.cameraBaseUrl = stripTrailingSlash(cameraBaseUrl);
        this.mlBaseUrl = stripTrailingSlash(mlBaseUrl);
    }

    public ExternalServiceHealthResult checkCamera() {
        return check(cameraBaseUrl, "Camera service");
    }

    public ExternalServiceHealthResult checkYolo() {
        return check(mlBaseUrl, "YOLO service");
    }

    private ExternalServiceHealthResult check(String baseUrl, String serviceName) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return new ExternalServiceHealthResult(
                    "not_configured",
                    serviceName + " base URL is not configured.",
                    "",
                    0L
            );
        }

        String urlString = baseUrl + "/health";
        long start = System.currentTimeMillis();
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(3000);
            connection.setRequestMethod("GET");
            int code = connection.getResponseCode();
            long elapsed = System.currentTimeMillis() - start;
            connection.disconnect();

            if (code >= 200 && code < 400) {
                String status = elapsed > 1500 ? "slow_response" : "online";
                return new ExternalServiceHealthResult(
                        status,
                        serviceName + " responded with HTTP " + code + " in " + elapsed + " ms.",
                        urlString,
                        elapsed
                );
            }

            return new ExternalServiceHealthResult(
                    "offline",
                    serviceName + " returned HTTP " + code + ".",
                    urlString,
                    System.currentTimeMillis() - start
            );
        } catch (Exception ex) {
            return new ExternalServiceHealthResult(
                    "offline",
                    serviceName + " did not respond to /health.",
                    urlString,
                    System.currentTimeMillis() - start
            );
        }
    }

    private String stripTrailingSlash(String value) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
