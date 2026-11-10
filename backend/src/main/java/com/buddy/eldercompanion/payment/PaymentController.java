package com.buddy.eldercompanion.payment;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import com.buddy.eldercompanion.payment.dto.ChargeRequest;
import com.buddy.eldercompanion.payment.dto.PaymentResponse;
import com.buddy.eldercompanion.payment.dto.WalletResponse;
import com.buddy.eldercompanion.payment.dto.WalletTransactionResponse;
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
 * Payment and wallet endpoints. Elders pay for bookings and can be refunded;
 * every user has a wallet with a transaction ledger.
 */
@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Payments", description = "Charges, refunds and wallet ledger")
public class PaymentController {

    private final PaymentService paymentService;
    private final WalletService walletService;

    public PaymentController(PaymentService paymentService, WalletService walletService) {
        this.paymentService = paymentService;
        this.walletService = walletService;
    }

    @Operation(summary = "Charge for a booking (elder, idempotent)")
    @PreAuthorize("hasRole('ELDER')")
    @PostMapping("/bookings/{bookingId}/payment")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse charge(@PathVariable UUID bookingId, @Valid @RequestBody ChargeRequest request) {
        return paymentService.charge(SecurityUtils.currentUserId(), bookingId, request);
    }

    @Operation(summary = "Refund a booking's payment (elder)")
    @PreAuthorize("hasRole('ELDER')")
    @PostMapping("/bookings/{bookingId}/payment/refund")
    public PaymentResponse refund(@PathVariable UUID bookingId) {
        return paymentService.refund(SecurityUtils.currentUserId(), bookingId);
    }

    @Operation(summary = "Get a booking's payment")
    @GetMapping("/bookings/{bookingId}/payment")
    public PaymentResponse getForBooking(@PathVariable UUID bookingId) {
        return paymentService.getForBooking(SecurityUtils.currentUserId(), bookingId);
    }

    @Operation(summary = "View the current user's wallet")
    @GetMapping("/wallet")
    public WalletResponse wallet() {
        return walletService.view(SecurityUtils.currentUserId());
    }

    @Operation(summary = "List the current user's wallet transactions")
    @GetMapping("/wallet/transactions")
    public PageResponse<WalletTransactionResponse> walletTransactions(Pageable pageable) {
        return walletService.transactions(SecurityUtils.currentUserId(), pageable);
    }
}
