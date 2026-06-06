package com.raincatcher.backend.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiAdvisorActionRepository extends JpaRepository<AiAdvisorActionEntity, Long> {

    List<AiAdvisorActionEntity> findTop20ByOrderByCreatedAtDesc();
}
