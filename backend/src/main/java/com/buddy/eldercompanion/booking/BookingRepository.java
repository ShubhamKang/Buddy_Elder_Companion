package com.buddy.eldercompanion.booking;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Page<Booking> findByElderId(UUID elderId, Pageable pageable);

    Page<Booking> findByBuddyId(UUID buddyId, Pageable pageable);

    Page<Booking> findByStatusAndBuddyIdIsNull(BookingStatus status, Pageable pageable);

    Optional<Booking> findByIdAndElderId(UUID id, UUID elderId);

    Optional<Booking> findByIdAndBuddyId(UUID id, UUID buddyId);

    boolean existsByIdAndElderId(UUID id, UUID elderId);

    boolean existsByIdAndBuddyId(UUID id, UUID buddyId);
}
