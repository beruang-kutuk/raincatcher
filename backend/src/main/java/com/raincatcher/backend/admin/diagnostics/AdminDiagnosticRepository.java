package com.raincatcher.backend.admin.diagnostics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminDiagnosticRepository extends JpaRepository<AdminDiagnosticEntity, Long> {

    List<AdminDiagnosticEntity> findTop50ByOrderByCreatedAtDesc();
}
