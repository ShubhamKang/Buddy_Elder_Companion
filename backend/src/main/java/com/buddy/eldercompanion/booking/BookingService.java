package com.buddy.eldercompanion.booking;

import com.buddy.eldercompanion.booking.dto.BookingResponse;
import com.buddy.eldercompanion.booking.dto.CreateBookingRequest;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.BusinessRuleException;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.notification.NotificationEvent;
import com.buddy.eldercompanion.user.UserDirectory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Orchestrates the booking lifecycle. Each transition validates both that the
 * move is legal (per {@link BookingStatus}) and that the acting user is allowed
 * to perform it (elder vs buddy). Responses carry the elder/buddy display names.
 */
@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UserDirectory userDirectory;

    public BookingService(BookingRepository bookingRepository,
                          ApplicationEventPublisher eventPublisher,
                          UserDirectory userDirectory) {
        this.bookingRepository = bookingRepository;
        this.eventPublisher = eventPublisher;
        this.userDirectory = userDirectory;
    }

    // ----- Elder actions -----

    @Transactional
    public BookingResponse create(UUID elderId, CreateBookingRequest request) {
        if (request.type() == BookingType.SCHEDULED) {
            if (request.scheduledAt() == null || request.scheduledAt().isBefore(Instant.now())) {
                throw new BusinessRuleException("Scheduled bookings require a future scheduledAt");
            }
        }
        Booking booking = Booking.builder()
                .elderId(elderId)
                .status(BookingStatus.REQUESTED)
                .type(request.type())
                .serviceNotes(request.serviceNotes())
                .scheduledAt(request.type() == BookingType.SCHEDULED ? request.scheduledAt() : null)
                .addressLine(request.addressLine())
                .city(request.city())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .build();
        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse cancel(UUID elderId, UUID bookingId, String reason) {
        Booking booking = requireElderBooking(elderId, bookingId);
        transition(booking, BookingStatus.CANCELLED);
        booking.setCancelReason(reason);
        return toResponse(bookingRepository.save(booking));
    }

    // ----- Buddy actions -----

    @Transactional
    public BookingResponse accept(UUID buddyId, UUID bookingId) {
        Booking booking = requireBooking(bookingId);
        if (booking.getBuddyId() != null) {
            throw new BusinessRuleException("Booking already assigned to a buddy");
        }
        transition(booking, BookingStatus.ACCEPTED);
        booking.setBuddyId(buddyId);
        Booking saved = bookingRepository.save(booking);
        eventPublisher.publishEvent(new NotificationEvent(
                saved.getElderId(), "BOOKING_ACCEPTED", "Your booking was accepted",
                "A buddy accepted your booking request.", saved.getId()));
        return toResponse(saved);
    }

    @Transactional
    public BookingResponse reject(UUID buddyId, UUID bookingId) {
        Booking booking = requireBooking(bookingId);
        // Rejecting an unassigned REQUESTED booking does not bind the buddy.
        transition(booking, BookingStatus.REJECTED);
        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse start(UUID buddyId, UUID bookingId) {
        Booking booking = requireBuddyBooking(buddyId, bookingId);
        transition(booking, BookingStatus.IN_PROGRESS);
        booking.setStartedAt(Instant.now());
        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse complete(UUID buddyId, UUID bookingId) {
        Booking booking = requireBuddyBooking(buddyId, bookingId);
        transition(booking, BookingStatus.COMPLETED);
        booking.setCompletedAt(Instant.now());
        Booking saved = bookingRepository.save(booking);
        eventPublisher.publishEvent(new NotificationEvent(
                saved.getElderId(), "BOOKING_COMPLETED", "Your booking is complete",
                "Your care session has been completed. You can leave a review.", saved.getId()));
        return toResponse(saved);
    }

    // ----- Queries -----

    @Transactional(readOnly = true)
    public BookingResponse get(UUID userId, UUID bookingId) {
        Booking booking = requireBooking(bookingId);
        if (!booking.getElderId().equals(userId) && !userId.equals(booking.getBuddyId())) {
            // Hide existence from unrelated users.
            throw new ResourceNotFoundException("Booking not found");
        }
        return toResponse(booking);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> listForElder(UUID elderId, Pageable pageable) {
        return toPage(bookingRepository.findByElderId(elderId, pageable));
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> listForBuddy(UUID buddyId, Pageable pageable) {
        return toPage(bookingRepository.findByBuddyId(buddyId, pageable));
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> listOpenRequests(Pageable pageable) {
        return toPage(bookingRepository.findByStatusAndBuddyIdIsNull(BookingStatus.REQUESTED, pageable));
    }

    // ----- Helpers -----

    private BookingResponse toResponse(Booking b) {
        return BookingResponse.from(b)
                .withNames(userDirectory.name(b.getElderId()), userDirectory.name(b.getBuddyId()));
    }

    /** Maps a page of bookings, resolving all names with one batched lookup. */
    private PageResponse<BookingResponse> toPage(Page<Booking> page) {
        List<UUID> ids = new ArrayList<>();
        page.getContent().forEach(b -> {
            ids.add(b.getElderId());
            ids.add(b.getBuddyId());
        });
        Map<UUID, String> names = userDirectory.names(ids);
        return PageResponse.from(page, b -> BookingResponse.from(b)
                .withNames(names.get(b.getElderId()), names.get(b.getBuddyId())));
    }

    private void transition(Booking booking, BookingStatus target) {
        if (!booking.getStatus().canTransitionTo(target)) {
            throw new BusinessRuleException(
                    "Illegal transition: " + booking.getStatus() + " -> " + target);
        }
        booking.setStatus(target);
    }

    private Booking requireBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
    }

    private Booking requireElderBooking(UUID elderId, UUID bookingId) {
        return bookingRepository.findByIdAndElderId(bookingId, elderId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
    }

    private Booking requireBuddyBooking(UUID buddyId, UUID bookingId) {
        return bookingRepository.findByIdAndBuddyId(bookingId, buddyId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
    }
}
