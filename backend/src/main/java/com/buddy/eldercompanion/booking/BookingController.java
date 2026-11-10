package com.buddy.eldercompanion.booking;

import com.buddy.eldercompanion.booking.dto.BookingResponse;
import com.buddy.eldercompanion.booking.dto.CancelBookingRequest;
import com.buddy.eldercompanion.booking.dto.CreateBookingRequest;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
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
 * Booking lifecycle endpoints. Elder-only actions (create, cancel, my-bookings)
 * and buddy-only actions (browse open requests, accept, reject, start, complete)
 * are separated by role.
 */
@RestController
@RequestMapping("/api/v1/bookings")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Bookings", description = "Request and manage care bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    // ----- Elder -----

    @Operation(summary = "Create a booking (elder)")
    @PreAuthorize("hasRole('ELDER')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@Valid @RequestBody CreateBookingRequest request) {
        return bookingService.create(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "List the current elder's bookings")
    @PreAuthorize("hasRole('ELDER')")
    @GetMapping("/mine/elder")
    public PageResponse<BookingResponse> myElderBookings(Pageable pageable) {
        return bookingService.listForElder(SecurityUtils.currentUserId(), pageable);
    }

    @Operation(summary = "Cancel a booking (elder)")
    @PreAuthorize("hasRole('ELDER')")
    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(@PathVariable UUID id, @Valid @RequestBody CancelBookingRequest request) {
        return bookingService.cancel(SecurityUtils.currentUserId(), id, request.reason());
    }

    // ----- Buddy -----

    @Operation(summary = "List open (unassigned) booking requests (buddy)")
    @PreAuthorize("hasRole('BUDDY')")
    @GetMapping("/open")
    public PageResponse<BookingResponse> openRequests(Pageable pageable) {
        return bookingService.listOpenRequests(pageable);
    }

    @Operation(summary = "List the current buddy's bookings")
    @PreAuthorize("hasRole('BUDDY')")
    @GetMapping("/mine/buddy")
    public PageResponse<BookingResponse> myBuddyBookings(Pageable pageable) {
        return bookingService.listForBuddy(SecurityUtils.currentUserId(), pageable);
    }

    @Operation(summary = "Accept a booking (buddy)")
    @PreAuthorize("hasRole('BUDDY')")
    @PostMapping("/{id}/accept")
    public BookingResponse accept(@PathVariable UUID id) {
        return bookingService.accept(SecurityUtils.currentUserId(), id);
    }

    @Operation(summary = "Reject a booking request (buddy)")
    @PreAuthorize("hasRole('BUDDY')")
    @PostMapping("/{id}/reject")
    public BookingResponse reject(@PathVariable UUID id) {
        return bookingService.reject(SecurityUtils.currentUserId(), id);
    }

    @Operation(summary = "Start an accepted booking (buddy)")
    @PreAuthorize("hasRole('BUDDY')")
    @PostMapping("/{id}/start")
    public BookingResponse start(@PathVariable UUID id) {
        return bookingService.start(SecurityUtils.currentUserId(), id);
    }

    @Operation(summary = "Complete an in-progress booking (buddy)")
    @PreAuthorize("hasRole('BUDDY')")
    @PostMapping("/{id}/complete")
    public BookingResponse complete(@PathVariable UUID id) {
        return bookingService.complete(SecurityUtils.currentUserId(), id);
    }

    // ----- Shared -----

    @Operation(summary = "Get a booking the current user participates in")
    @GetMapping("/{id}")
    public BookingResponse get(@PathVariable UUID id) {
        return bookingService.get(SecurityUtils.currentUserId(), id);
    }
}
