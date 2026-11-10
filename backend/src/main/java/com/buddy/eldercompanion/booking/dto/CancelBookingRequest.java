package com.buddy.eldercompanion.booking.dto;

import jakarta.validation.constraints.Size;

public record CancelBookingRequest(
        @Size(max = 500) String reason
) {
}
