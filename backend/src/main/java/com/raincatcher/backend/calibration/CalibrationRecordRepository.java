package com.raincatcher.backend.calibration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CalibrationRecordRepository extends JpaRepository<CalibrationRecordEntity, Long> {

    List<CalibrationRecordEntity> findTop50ByOrderByCreatedAtDesc();

    List<CalibrationRecordEntity> findTop10ByModuleOrderByCreatedAtDesc(String module);

    Optional<CalibrationRecordEntity> findTopByModuleOrderByCreatedAtDesc(String module);
}
