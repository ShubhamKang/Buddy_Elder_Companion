package com.buddy.eldercompanion.payment;

import com.buddy.eldercompanion.booking.Booking;
import com.buddy.eldercompanion.booking.BookingRepository;
import com.buddy.eldercompanion.exception.BusinessRuleException;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.payment.dto.ChargeRequest;
import com.buddy.eldercompanion.payment.dto.PaymentResponse;
import com.buddy.eldercompanion.payment.provider.PaymentProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Charges and refunds for bookings. Charges are idempotent by idempotency key so
 * client retries never double-charge. Refunds credit the payer's wallet and are
 * triggered on cancellation of a captured payment.
 */
@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final PaymentProvider paymentProvider;
    private final WalletService walletService;

    public PaymentService(PaymentRepository paymentRepository,
                          BookingRepository bookingRepository,
                          PaymentProvider paymentProvider,
                          WalletService walletService) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.paymentProvider = paymentProvider;
        this.walletService = walletService;
    }

    @Transactional
    public PaymentResponse charge(UUID payerId, UUID bookingId, ChargeRequest request) {
        // Idempotency: an existing payment for this key is returned as-is.
        var existing = paymentRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existing.isPresent()) {
            return PaymentResponse.from(existing.get());
        }
        Booking booking = bookingRepository.findByIdAndElderId(bookingId, payerId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (paymentRepository.findByBookingId(bookingId).isPresent()) {
            throw new BusinessRuleException("Booking already has a payment");
        }

        Payment payment = Payment.builder()
                .bookingId(booking.getId())
                .payerId(payerId)
                .amount(request.amount())
                .currency("INR")
                .status(PaymentStatus.CREATED)
                .provider(paymentProvider.name())
                .idempotencyKey(request.idempotencyKey())
                .build();
        payment = paymentRepository.save(payment);

        PaymentProvider.ChargeResult result =
                paymentProvider.charge(request.amount(), "INR", request.idempotencyKey());
        if (result.success()) {
            payment.setStatus(PaymentStatus.CAPTURED);
            payment.setProviderRef(result.providerRef());
        } else {
            payment.setStatus(PaymentStatus.FAILED);
        }
        payment = paymentRepository.save(payment);

        if (payment.getStatus() == PaymentStatus.FAILED) {
            throw new BusinessRuleException("Payment failed: " + result.failureReason());
        }
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse refund(UUID payerId, UUID bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("No payment for booking"));
        if (!payment.getPayerId().equals(payerId)) {
            throw new ResourceNotFoundException("No payment for booking");
        }
        if (payment.getStatus() != PaymentStatus.CAPTURED) {
            throw new BusinessRuleException("Only captured payments can be refunded");
        }
        PaymentProvider.RefundResult result =
                paymentProvider.refund(payment.getProviderRef(), payment.getAmount());
        if (!result.success()) {
            throw new BusinessRuleException("Refund failed: " + result.failureReason());
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRepository.save(payment);
        // Credit the payer's wallet with the refunded amount.
        walletService.credit(payerId, payment.getAmount(), "REFUND",
                "Refund for booking " + bookingId, payment.getId());
        return PaymentResponse.from(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getForBooking(UUID userId, UUID bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("No payment for booking"));
        if (!payment.getPayerId().equals(userId)) {
            throw new ResourceNotFoundException("No payment for booking");
        }
        return PaymentResponse.from(payment);
    }
}
