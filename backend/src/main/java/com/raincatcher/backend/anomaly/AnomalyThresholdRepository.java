package com.raincatcher.backend.anomaly;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnomalyThresholdRepository extends JpaRepository<AnomalyThresholdEntity, Long> {

    Optional<AnomalyThresholdEntity> findByThresholdKey(String thresholdKey);
}
