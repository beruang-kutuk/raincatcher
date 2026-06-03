package com.raincatcher.backend.admin.health;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminSystemHealthRepository extends JpaRepository<AdminSystemHealthEntity, Long> {

    List<AdminSystemHealthEntity> findAllByOrderByServiceNameAsc();

    Optional<AdminSystemHealthEntity> findByServiceKey(String serviceKey);
}
