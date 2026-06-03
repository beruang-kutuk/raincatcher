package com.raincatcher.backend.admin.forecastsettings;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminForecastSettingsRepository extends JpaRepository<AdminForecastSettingsEntity, Long> {

    List<AdminForecastSettingsEntity> findAllByOrderByIdAsc();

    Optional<AdminForecastSettingsEntity> findBySettingKey(String settingKey);
}
