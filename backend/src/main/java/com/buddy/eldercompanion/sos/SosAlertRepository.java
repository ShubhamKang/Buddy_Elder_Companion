package com.buddy.eldercompanion.sos;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SosAlertRepository extends JpaRepository<SosAlert, UUID> {

    Page<SosAlert> findByElderIdOrderByCreatedAtDesc(UUID elderId, Pageable pageable);

    Optional<SosAlert> findByIdAndElderId(UUID id, UUID elderId);
}
