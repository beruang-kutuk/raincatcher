package com.raincatcher.backend.testdb;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class DatabaseTestService {

    private final DatabaseTestRepository repository;
    private final JdbcTemplate jdbcTemplate;

    public DatabaseTestService(DatabaseTestRepository repository, JdbcTemplate jdbcTemplate) {
        this.repository = repository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public List<DatabaseTestEntry> insertDummyEntries() {
        List<DatabaseTestEntry> entries = List.of(
                createEntry(
                        "Dummy database test row 1",
                        "RC-DUMMY-01",
                        "TANK_A",
                        7.10,
                        2.50,
                        27.20,
                        38.50,
                        62.00,
                        LocalDateTime.now()
                ),
                createEntry(
                        "Dummy database test row 2",
                        "RC-DUMMY-02",
                        "TANK_A",
                        7.40,
                        3.10,
                        27.80,
                        36.20,
                        66.00,
                        LocalDateTime.now()
                )
        );

        return repository.saveAll(entries);
    }

    public Optional<DatabaseTestEntry> getLatestEntry() {
        return repository.findTopByOrderByCreatedAtDesc();
    }

    public List<DatabaseTestEntry> getRecentEntries() {
        return repository.findTop20ByOrderByCreatedAtDesc();
    }

    public long getRowCount() {
        return repository.count();
    }

    public String getCurrentDatabaseName() {
        return jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
    }

    private DatabaseTestEntry createEntry(
            String label,
            String deviceId,
            String tankId,
            Double ph,
            Double turbidity,
            Double waterTemperature,
            Double ultrasonicDistanceCm,
            Double waterLevelPercent,
            LocalDateTime createdAt
    ) {
        DatabaseTestEntry entry = new DatabaseTestEntry();
        entry.setLabel(label);
        entry.setDeviceId(deviceId);
        entry.setTankId(tankId);
        entry.setPh(ph);
        entry.setTurbidity(turbidity);
        entry.setWaterTemperature(waterTemperature);
        entry.setUltrasonicDistanceCm(ultrasonicDistanceCm);
        entry.setWaterLevelPercent(waterLevelPercent);
        entry.setStatus("dummy");
        entry.setCreatedAt(createdAt);
        return entry;
    }
}
