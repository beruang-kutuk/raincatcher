package com.raincatcher.backend.admin.device;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminDeviceRepository extends JpaRepository<AdminDeviceEntity, Long> {

    List<AdminDeviceEntity> findAllByOrderByIdAsc();

    Optional<AdminDeviceEntity> findByInputTag(String inputTag);
}
