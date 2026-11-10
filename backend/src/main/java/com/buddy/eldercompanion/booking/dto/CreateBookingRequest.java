package com.buddy.eldercompanion.booking.dto;

import com.buddy.eldercompanion.booking.BookingType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Elder's request to create a booking. For SCHEDULED bookings a future
 * {@code scheduledAt} is required (validated in the service).
 */
public record CreateBookingRequest(
        @NotNull BookingType type,
        @Size(max = 1000) String serviceNotes,
        Instant scheduledAt,
        @Size(max = 500) String addressLine,
        @Size(max = 100) String city,
        Double latitude,
        Double longitude
) {
}
