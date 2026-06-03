package com.raincatcher.backend.anomaly;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AnomalyRepository extends JpaRepository<AnomalyEntity, Long> {

    List<AnomalyEntity> findTop100ByOrderByCreatedAtDesc();

    List<AnomalyEntity> findTop100ByStatusNotOrderByCreatedAtDesc(String status);

    long countByStatusNot(String status);

    long countByStatusNotAndSeverity(String status, String severity);

    Optional<AnomalyEntity> findFirstByStatusNotAndSourceTagAndTitleOrderByCreatedAtDesc(
            String status,
            String sourceTag,
            String title
    );
}
