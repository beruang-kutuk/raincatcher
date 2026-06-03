package com.raincatcher.backend.anomaly;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AnomalyEventRepository extends JpaRepository<AnomalyEventEntity, Long> {
}
