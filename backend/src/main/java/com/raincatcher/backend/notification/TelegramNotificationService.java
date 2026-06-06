package com.raincatcher.backend.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class TelegramNotificationService {

    private final boolean enabled;
    private final String botToken;
    private final String chatId;
    private final String apiUrl;
    private final RestClient restClient;

    public TelegramNotificationService(
            @Value("${telegram.enabled:false}") boolean enabled,
            @Value("${telegram.bot-token:}") String botToken,
            @Value("${telegram.chat-id:}") String chatId,
            @Value("${telegram.api-url:https://api.telegram.org}") String apiUrl
    ) {
        this.enabled = enabled;
        this.botToken = trim(botToken);
        this.chatId = trim(chatId);
        this.apiUrl = stripTrailingSlash(apiUrl);

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(6));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public Map<String, Object> sendTestMessage() {
        return sendMessage("Raincatcher test alert\nTelegram notifications are configured for backend alerts.");
    }

    public boolean sendAlert(NotificationAlertEntity alert) {
        if (alert == null || !isConfigured()) {
            return false;
        }

        String text = String.join("\n",
                "Raincatcher alert",
                "Severity: " + safe(alert.getSeverity()).toUpperCase(),
                "Title: " + safe(alert.getTitle()),
                "Details: " + safe(alert.getMessage()),
                "Link: " + safe(alert.getLinkPath())
        );
        Map<String, Object> result = sendMessage(text);
        return Boolean.TRUE.equals(result.get("sent"));
    }

    private Map<String, Object> sendMessage(String text) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (!enabled) {
            result.put("sent", false);
            result.put("status", "disabled");
            result.put("message", "Telegram notifications are disabled.");
            return result;
        }
        if (!isConfigured()) {
            result.put("sent", false);
            result.put("status", "not_configured");
            result.put("message", "Telegram bot token or chat ID is missing.");
            return result;
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("chat_id", chatId);
            payload.put("text", text);
            payload.put("disable_web_page_preview", true);

            restClient.post()
                    .uri(apiUrl + "/bot" + botToken + "/sendMessage")
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            result.put("sent", true);
            result.put("status", "sent");
            result.put("message", "Telegram message sent.");
        } catch (Exception ex) {
            result.put("sent", false);
            result.put("status", "failed");
            result.put("message", "Telegram request failed.");
        }
        return result;
    }

    private boolean isConfigured() {
        return enabled && !botToken.isBlank() && !chatId.isBlank() && !apiUrl.isBlank();
    }

    private String stripTrailingSlash(String value) {
        String trimmed = trim(value);
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
