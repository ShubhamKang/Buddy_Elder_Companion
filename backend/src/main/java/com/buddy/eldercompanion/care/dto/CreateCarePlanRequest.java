package com.buddy.eldercompanion.care.dto;

import com.buddy.eldercompanion.care.Cadence;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateCarePlanRequest(
        @NotNull @Size(max = 200) String title,
        @NotNull Cadence cadence,
        @NotNull Instant firstRunAt
) {
}
