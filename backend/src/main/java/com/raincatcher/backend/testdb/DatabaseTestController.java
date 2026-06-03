package com.raincatcher.backend.testdb;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test-db")
public class DatabaseTestController {

    private static final String EXPECTED_DATABASE = "raincatcher_db";
    private static final String TEST_TABLE = "database_test_entries";

    private final DatabaseTestService service;

    public DatabaseTestController(DatabaseTestService service) {
        this.service = service;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Database test API is running"
        ));
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> check() {
        try {
            String databaseName = service.getCurrentDatabaseName();
            long rowCount = service.getRowCount();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "connected");
            response.put("database", databaseName);
            response.put("table", TEST_TABLE);
            response.put("rowCount", rowCount);
            response.put("latest", service.getLatestEntry().orElse(null));

            if (!EXPECTED_DATABASE.equals(databaseName)) {
                response.put("status", "error");
                response.put("message", "Connected database is not raincatcher_db");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }

            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Database connection failed"
            ));
        }
    }

    @PostMapping("/seed-dummy")
    public ResponseEntity<Map<String, Object>> seedDummy() {
        List<DatabaseTestEntry> entries = service.insertDummyEntries();

        return ResponseEntity.ok(Map.of(
                "message", "Dummy database test entries inserted successfully",
                "count", entries.size(),
                "data", entries
        ));
    }

    @GetMapping("/all")
    public ResponseEntity<List<DatabaseTestEntry>> all() {
        return ResponseEntity.ok(service.getRecentEntries());
    }
}
