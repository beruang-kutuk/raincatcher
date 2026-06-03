package com.raincatcher.backend.iot;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IotTelemetryRepository extends JpaRepository<IotTelemetryEntity, Long> {

    Optional<IotTelemetryEntity> findTopByOrderByCreatedAtDesc();

    List<IotTelemetryEntity> findTop50ByOrderByCreatedAtDesc();

    Optional<IotTelemetryEntity> findTopByOrderByIdDesc();

    List<IotTelemetryEntity> findTop50ByOrderByIdDesc();
}
