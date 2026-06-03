package com.raincatcher.backend.weather;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WeatherRecordRepository extends JpaRepository<WeatherRecordEntity, Long> {

    Optional<WeatherRecordEntity> findTopByLocationAndRecordTypeOrderByRecordedAtDesc(String location, String recordType);

    Optional<WeatherRecordEntity> findTopByRecordTypeOrderByRecordedAtDesc(String recordType);

    Optional<WeatherRecordEntity> findTopByOrderByRecordedAtDesc();

    List<WeatherRecordEntity> findTop100ByOrderByRecordedAtDesc();
}
