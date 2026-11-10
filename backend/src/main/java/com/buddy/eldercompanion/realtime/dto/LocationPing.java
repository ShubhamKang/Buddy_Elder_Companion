package com.buddy.eldercompanion.realtime.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

/**
 * A live location update broadcast while a buddy is en route for a booking.
 */
public record LocationPing(
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
        UUID senderId,
        Instant timestamp
) {
    public static LocationPing broadcast(double lat, double lng, UUID senderId) {
        return new LocationPing(lat, lng, senderId, Instant.now());
    }
}
