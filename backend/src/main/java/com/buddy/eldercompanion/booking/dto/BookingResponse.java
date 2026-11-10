package com.buddy.eldercompanion.booking.dto;

import com.buddy.eldercompanion.booking.Booking;
import com.buddy.eldercompanion.booking.BookingStatus;
import com.buddy.eldercompanion.booking.BookingType;

import java.time.Instant;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        UUID elderId,
        String elderName,
        UUID buddyId,
        String buddyName,
        BookingStatus status,
        BookingType type,
        String serviceNotes,
        Instant scheduledAt,
        Instant startedAt,
        Instant completedAt,
        String cancelReason,
        String addressLine,
        String city,
        Double latitude,
        Double longitude,
        Instant createdAt
) {
    /** Maps a booking without display names; use {@link #withNames} to enrich. */
    public static BookingResponse from(Booking b) {
        return new BookingResponse(
                b.getId(), b.getElderId(), null, b.getBuddyId(), null, b.getStatus(), b.getType(),
                b.getServiceNotes(), b.getScheduledAt(), b.getStartedAt(), b.getCompletedAt(),
                b.getCancelReason(), b.getAddressLine(), b.getCity(),
                b.getLatitude(), b.getLongitude(), b.getCreatedAt());
    }

    public BookingResponse withNames(String elderName, String buddyName) {
        return new BookingResponse(id, elderId, elderName, buddyId, buddyName, status, type,
                serviceNotes, scheduledAt, startedAt, completedAt, cancelReason, addressLine, city,
                latitude, longitude, createdAt);
    }
}
