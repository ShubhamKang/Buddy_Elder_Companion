package com.buddy.eldercompanion.review.dto;

import com.buddy.eldercompanion.review.Review;

import java.time.Instant;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID bookingId,
        UUID reviewerId,
        UUID buddyId,
        int rating,
        String comment,
        Instant createdAt
) {
    public static ReviewResponse from(Review r) {
        return new ReviewResponse(r.getId(), r.getBookingId(), r.getReviewerId(),
                r.getBuddyId(), r.getRating(), r.getComment(), r.getCreatedAt());
    }
}
