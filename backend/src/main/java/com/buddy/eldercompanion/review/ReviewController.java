package com.buddy.eldercompanion.review;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import com.buddy.eldercompanion.review.dto.CreateReviewRequest;
import com.buddy.eldercompanion.review.dto.ReviewResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Review endpoints. Elders create reviews for their completed bookings; a
 * buddy's reviews are publicly readable by any authenticated user.
 */
@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Reviews", description = "Ratings and reviews for buddies")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @Operation(summary = "Review the buddy for a completed booking (elder)")
    @PreAuthorize("hasRole('ELDER')")
    @PostMapping("/bookings/{bookingId}/review")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse create(@PathVariable UUID bookingId,
                                 @Valid @RequestBody CreateReviewRequest request) {
        return reviewService.createReview(SecurityUtils.currentUserId(), bookingId, request);
    }

    @Operation(summary = "Get the review left for a booking (participants only)")
    @GetMapping("/bookings/{bookingId}/review")
    public ReviewResponse forBooking(@PathVariable UUID bookingId) {
        return reviewService.getForBooking(SecurityUtils.currentUserId(), bookingId);
    }

    @Operation(summary = "List reviews for a buddy")
    @GetMapping("/buddies/{buddyId}/reviews")
    public PageResponse<ReviewResponse> forBuddy(@PathVariable UUID buddyId, Pageable pageable) {
        return reviewService.listForBuddy(buddyId, pageable);
    }
}
