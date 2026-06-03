package com.raincatcher.backend.admin.reporttemplate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminReportTemplateRepository extends JpaRepository<AdminReportTemplateEntity, Long> {

    List<AdminReportTemplateEntity> findAllByOrderByUpdatedAtDesc();
}
