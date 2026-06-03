package com.raincatcher.backend.reports;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<ReportEntity, Long> {

    List<ReportEntity> findTop50ByOrderByCreatedAtDesc();
}
