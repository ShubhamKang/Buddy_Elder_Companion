package com.buddy.eldercompanion.sos;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, UUID> {

    List<EmergencyContact> findByElderId(UUID elderId);

    Optional<EmergencyContact> findByIdAndElderId(UUID id, UUID elderId);
}
