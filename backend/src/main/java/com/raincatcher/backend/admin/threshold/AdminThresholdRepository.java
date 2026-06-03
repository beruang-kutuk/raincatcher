package com.raincatcher.backend.admin.threshold;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminThresholdRepository extends JpaRepository<AdminThresholdEntity, Long> {

    List<AdminThresholdEntity> findAllByOrderByIdAsc();

    Optional<AdminThresholdEntity> findByThresholdKey(String thresholdKey);
}
