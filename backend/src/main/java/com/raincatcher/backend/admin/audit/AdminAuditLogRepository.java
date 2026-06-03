package com.raincatcher.backend.admin.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLogEntity, Long> {

    List<AdminAuditLogEntity> findTop100ByOrderByCreatedAtDesc();
}
