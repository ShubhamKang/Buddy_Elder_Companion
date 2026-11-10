package com.buddy.eldercompanion.care;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CarePlanRepository extends JpaRepository<CarePlan, UUID> {

    List<CarePlan> findByElderId(UUID elderId);

    Optional<CarePlan> findByIdAndElderId(UUID id, UUID elderId);

    List<CarePlan> findByActiveTrueAndNextRunAtLessThanEqual(Instant now);
}
