package com.raincatcher.backend.simulation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SimulationScenarioRepository extends JpaRepository<SimulationScenarioEntity, Long> {

    List<SimulationScenarioEntity> findTop100ByOrderByCreatedAtDesc();
}
