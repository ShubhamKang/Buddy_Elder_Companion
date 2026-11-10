package com.buddy.eldercompanion.review;

import com.buddy.eldercompanion.booking.Booking;
import com.buddy.eldercompanion.booking.BookingRepository;
import com.buddy.eldercompanion.booking.BookingStatus;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.BusinessRuleException;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.profile.BuddyProfile;
import com.buddy.eldercompanion.profile.BuddyProfileRepository;
import com.buddy.eldercompanion.review.dto.CreateReviewRequest;
import com.buddy.eldercompanion.review.dto.ReviewResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Reviews are "verified-booking-only": an elder may review a buddy exactly once
 * per COMPLETED booking they own. Writing a review recomputes the buddy's
 * aggregate rating on their profile.
 */
@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final BuddyProfileRepository buddyProfileRepository;

    public ReviewService(ReviewRepository reviewRepository,
                         BookingRepository bookingRepository,
                         BuddyProfileRepository buddyProfileRepository) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.buddyProfileRepository = buddyProfileRepository;
    }

    @Transactional
    public ReviewResponse createReview(UUID elderId, UUID bookingId, CreateReviewRequest request) {
        Booking booking = bookingRepository.findByIdAndElderId(bookingId, elderId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BusinessRuleException("Only completed bookings can be reviewed");
        }
        if (booking.getBuddyId() == null) {
            throw new BusinessRuleException("Booking has no assigned buddy to review");
        }
        if (reviewRepository.existsByBookingId(bookingId)) {
            throw new BusinessRuleException("This booking has already been reviewed");
        }
        Review review = Review.builder()
                .bookingId(bookingId)
                .reviewerId(elderId)
                .buddyId(booking.getBuddyId())
                .rating(request.rating())
                .comment(request.comment())
                .build();
        review = reviewRepository.save(review);
        recomputeBuddyRating(booking.getBuddyId());
        return ReviewResponse.from(review);
    }

    /**
     * The review for a booking, visible only to the booking's participants.
     * Lets clients show "already reviewed" instead of an empty review form.
     */
    @Transactional(readOnly = true)
    public ReviewResponse getForBooking(UUID userId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        boolean participant = booking.getElderId().equals(userId) || userId.equals(booking.getBuddyId());
        if (!participant) {
            throw new ResourceNotFoundException("Booking not found");
        }
        return reviewRepository.findByBookingId(bookingId)
                .map(ReviewResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("No review for this booking"));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> listForBuddy(UUID buddyId, Pageable pageable) {
        return PageResponse.from(reviewRepository.findByBuddyId(buddyId, pageable), ReviewResponse::from);
    }

    /**
     * Recomputes and persists the buddy's aggregate rating. No-op if the buddy
     * has no profile row yet.
     */
    private void recomputeBuddyRating(UUID buddyId) {
        buddyProfileRepository.findById(buddyId).ifPresent(profile -> {
            long count = reviewRepository.countByBuddyId(buddyId);
            double avg = reviewRepository.averageRatingForBuddy(buddyId);
            profile.setRatingCount((int) count);
            profile.setRatingAverage(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            buddyProfileRepository.save(profile);
        });
    }
}
