package com.raincatcher.backend.notification;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<NotificationAlertEntity>> latest() {
        return ResponseEntity.ok(service.latest());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(service.unreadCount());
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationAlertEntity> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(service.markRead(id));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, Long>> markAllRead() {
        return ResponseEntity.ok(service.markAllRead());
    }

    @PostMapping("/test-telegram")
    public ResponseEntity<Map<String, Object>> testTelegram() {
        return ResponseEntity.ok(service.sendTelegramTest());
    }
}
