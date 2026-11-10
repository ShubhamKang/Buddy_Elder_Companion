package com.buddy.eldercompanion.care.dto;

import com.buddy.eldercompanion.care.Cadence;
import com.buddy.eldercompanion.care.CarePlan;

import java.time.Instant;
import java.util.UUID;

public record CarePlanResponse(
        UUID id,
        String title,
        Cadence cadence,
        Instant nextRunAt,
        boolean active
) {
    public static CarePlanResponse from(CarePlan p) {
        return new CarePlanResponse(p.getId(), p.getTitle(), p.getCadence(), p.getNextRunAt(), p.isActive());
    }
}
