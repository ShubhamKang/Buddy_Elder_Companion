package com.buddy.eldercompanion.payment.dto;

import com.buddy.eldercompanion.payment.Payment;
import com.buddy.eldercompanion.payment.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID bookingId,
        UUID payerId,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        String provider,
        String providerRef,
        Instant createdAt
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(p.getId(), p.getBookingId(), p.getPayerId(), p.getAmount(),
                p.getCurrency(), p.getStatus(), p.getProvider(), p.getProviderRef(), p.getCreatedAt());
    }
}
