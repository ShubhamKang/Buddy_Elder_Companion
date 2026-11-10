package com.buddy.eldercompanion.care.dto;

import com.buddy.eldercompanion.care.Reminder;
import com.buddy.eldercompanion.care.ReminderType;

import java.time.Instant;
import java.util.UUID;

public record ReminderResponse(
        UUID id,
        ReminderType type,
        String message,
        Instant remindAt,
        boolean sent
) {
    public static ReminderResponse from(Reminder r) {
        return new ReminderResponse(r.getId(), r.getType(), r.getMessage(), r.getRemindAt(), r.isSent());
    }
}
