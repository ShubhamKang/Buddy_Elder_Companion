package com.buddy.eldercompanion.payment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Optional<Payment> findByBookingId(UUID bookingId);

    Optional<Payment> findByIdAndPayerId(UUID id, UUID payerId);
}
