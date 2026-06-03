package com.raincatcher.backend.testdb;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DatabaseTestRepository extends JpaRepository<DatabaseTestEntry, Long> {

    Optional<DatabaseTestEntry> findTopByOrderByCreatedAtDesc();

    List<DatabaseTestEntry> findTop20ByOrderByCreatedAtDesc();
}
