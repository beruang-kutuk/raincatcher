package com.raincatcher.backend.forecast;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ForecastRunRepository extends JpaRepository<ForecastRunEntity, Long> {

    List<ForecastRunEntity> findTop50ByOrderByCreatedAtDesc();

    Optional<ForecastRunEntity> findTopByStatusOrderByCreatedAtDesc(String status);

    Optional<ForecastRunEntity> findTopByModuleAndStatusOrderByCreatedAtDesc(String module, String status);
}
