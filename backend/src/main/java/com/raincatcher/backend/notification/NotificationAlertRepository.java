package com.raincatcher.backend.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

public interface NotificationAlertRepository extends JpaRepository<NotificationAlertEntity, Long> {

    List<NotificationAlertEntity> findTop50ByOrderByCreatedAtDesc();

    long countByReadAtIsNull();

    Optional<NotificationAlertEntity> findFirstBySourceTypeAndSourceIdOrderByCreatedAtDesc(
            String sourceType,
            Long sourceId
    );

    Optional<NotificationAlertEntity> findFirstByAlertKeyAndTelegramSentAtAfterOrderByTelegramSentAtDesc(
            String alertKey,
            LocalDateTime cutoff
    );
}
