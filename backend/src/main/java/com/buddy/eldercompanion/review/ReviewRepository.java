package com.buddy.eldercompanion.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    boolean existsByBookingId(UUID bookingId);

    java.util.Optional<Review> findByBookingId(UUID bookingId);

    Page<Review> findByBuddyId(UUID buddyId, Pageable pageable);

    long countByBuddyId(UUID buddyId);

    @Query("select coalesce(avg(r.rating), 0) from Review r where r.buddyId = :buddyId")
    double averageRatingForBuddy(@Param("buddyId") UUID buddyId);
}
