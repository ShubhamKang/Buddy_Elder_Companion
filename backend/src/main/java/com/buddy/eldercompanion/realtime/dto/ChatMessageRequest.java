package com.buddy.eldercompanion.realtime.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Inbound chat message payload sent over STOMP or REST.
 */
public record ChatMessageRequest(
        @NotBlank @Size(max = 2000) String content
) {
}
