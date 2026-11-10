package com.buddy.eldercompanion.realtime.dto;

import com.buddy.eldercompanion.realtime.ChatMessage;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID bookingId,
        UUID senderId,
        String content,
        Instant createdAt
) {
    public static ChatMessageResponse from(ChatMessage m) {
        return new ChatMessageResponse(m.getId(), m.getBookingId(), m.getSenderId(),
                m.getContent(), m.getCreatedAt());
    }
}
