package com.buddy.eldercompanion.admin;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID actorId,
        String action,
        String targetType,
        UUID targetId,
        String detail,
        Instant createdAt
) {
    public static AuditLogResponse from(AuditLog a) {
        return new AuditLogResponse(a.getId(), a.getActorId(), a.getAction(),
                a.getTargetType(), a.getTargetId(), a.getDetail(), a.getCreatedAt());
    }
}
