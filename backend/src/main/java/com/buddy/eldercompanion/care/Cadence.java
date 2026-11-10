package com.buddy.eldercompanion.care;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Recurrence cadence for a care plan, with the logic to advance a run time.
 */
public enum Cadence {
    DAILY,
    WEEKLY,
    MONTHLY;

    public Instant advance(Instant from) {
        return switch (this) {
            case DAILY -> from.plus(1, ChronoUnit.DAYS);
            case WEEKLY -> from.plus(7, ChronoUnit.DAYS);
            case MONTHLY -> from.plus(30, ChronoUnit.DAYS);
        };
    }
}
