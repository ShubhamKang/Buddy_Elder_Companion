package com.buddy.eldercompanion.admin;

import com.buddy.eldercompanion.admin.dto.AdminUserResponse;
import com.buddy.eldercompanion.admin.dto.BuddyVerificationResponse;
import com.buddy.eldercompanion.admin.dto.VerificationDecisionRequest;
import com.buddy.eldercompanion.booking.dto.BookingResponse;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Admin dashboards and the buddy verification workflow. All endpoints ADMIN-only.
 */
@RestController
@RequestMapping("/api/v1/admin")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Administration, verification and audit")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @Operation(summary = "List all users")
    @GetMapping("/users")
    public PageResponse<AdminUserResponse> users(Pageable pageable) {
        return adminService.listUsers(pageable);
    }

    @Operation(summary = "List all bookings")
    @GetMapping("/bookings")
    public PageResponse<BookingResponse> bookings(Pageable pageable) {
        return adminService.listBookings(pageable);
    }

    @Operation(summary = "List buddies pending verification")
    @GetMapping("/verifications/pending")
    public PageResponse<BuddyVerificationResponse> pending(Pageable pageable) {
        return adminService.listPendingVerifications(pageable);
    }

    @Operation(summary = "Approve or reject a buddy's verification")
    @PostMapping("/verifications/{buddyUserId}")
    public BuddyVerificationResponse decide(@PathVariable UUID buddyUserId,
                                            @Valid @RequestBody VerificationDecisionRequest request) {
        return adminService.decideVerification(SecurityUtils.currentUserId(), buddyUserId, request);
    }

    @Operation(summary = "View the current admin's audit log")
    @GetMapping("/audit-log")
    public PageResponse<AuditLogResponse> auditLog(Pageable pageable) {
        return adminService.myAuditLog(SecurityUtils.currentUserId(), pageable);
    }
}
