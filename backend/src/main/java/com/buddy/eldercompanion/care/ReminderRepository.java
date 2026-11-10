package com.buddy.eldercompanion.care;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReminderRepository extends JpaRepository<Reminder, UUID> {

    Page<Reminder> findByElderIdOrderByRemindAtDesc(UUID elderId, Pageable pageable);

    Optional<Reminder> findByIdAndElderId(UUID id, UUID elderId);

    List<Reminder> findBySentFalseAndRemindAtLessThanEqual(Instant now);
}
