package com.raincatcher.backend.camera;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CameraRecordRepository extends JpaRepository<CameraRecordEntity, Long> {

    Optional<CameraRecordEntity> findTopByOrderByCreatedAtDesc();

    List<CameraRecordEntity> findTop50ByOrderByCreatedAtDesc();

    Optional<CameraRecordEntity> findTopByRecordTypeOrderByCreatedAtDesc(String recordType);

    List<CameraRecordEntity> findTop20ByRecordTypeOrderByCreatedAtDesc(String recordType);
}
