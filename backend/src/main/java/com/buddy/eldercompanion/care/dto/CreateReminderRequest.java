package com.buddy.eldercompanion.care.dto;

import com.buddy.eldercompanion.care.ReminderType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateReminderRequest(
        @NotNull ReminderType type,
        @NotNull @Size(max = 500) String message,
        @NotNull Instant remindAt
) {
}
