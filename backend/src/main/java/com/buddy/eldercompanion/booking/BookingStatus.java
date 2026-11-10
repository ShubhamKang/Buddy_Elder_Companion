package com.buddy.eldercompanion.booking;

import java.util.Set;

/**
 * Booking lifecycle states and the legal transitions between them.
 * <p>
 * Happy path: REQUESTED -> ACCEPTED -> IN_PROGRESS -> COMPLETED.
 * A booking may be CANCELLED (by the elder) while not yet completed, or
 * REJECTED (by a buddy) while still REQUESTED.
 */
public enum BookingStatus {
    REQUESTED,
    ACCEPTED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
    REJECTED;

    private static final java.util.Map<BookingStatus, Set<BookingStatus>> TRANSITIONS =
            java.util.Map.of(
                    REQUESTED, Set.of(ACCEPTED, REJECTED, CANCELLED),
                    ACCEPTED, Set.of(IN_PROGRESS, CANCELLED),
                    IN_PROGRESS, Set.of(COMPLETED, CANCELLED),
                    COMPLETED, Set.of(),
                    CANCELLED, Set.of(),
                    REJECTED, Set.of());

    public boolean canTransitionTo(BookingStatus target) {
        return TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }

    public boolean isTerminal() {
        return TRANSITIONS.getOrDefault(this, Set.of()).isEmpty();
    }
}
