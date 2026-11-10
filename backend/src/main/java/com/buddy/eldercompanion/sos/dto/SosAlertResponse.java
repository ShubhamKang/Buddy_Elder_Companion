package com.buddy.eldercompanion.sos.dto;

import com.buddy.eldercompanion.sos.SosAlert;
import com.buddy.eldercompanion.sos.SosStatus;

import java.time.Instant;
import java.util.UUID;

public record SosAlertResponse(
        UUID id,
        UUID elderId,
        SosStatus status,
        Double latitude,
        Double longitude,
        String note,
        int contactsNotified,
        Instant createdAt,
        Instant resolvedAt
) {
    public static SosAlertResponse from(SosAlert a, int contactsNotified) {
        return new SosAlertResponse(a.getId(), a.getElderId(), a.getStatus(),
                a.getLatitude(), a.getLongitude(), a.getNote(), contactsNotified,
                a.getCreatedAt(), a.getResolvedAt());
    }
}
