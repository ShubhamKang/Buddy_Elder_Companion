package com.buddy.eldercompanion.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request to charge for a booking. The idempotency key makes retries safe:
 * repeating the same key returns the original payment instead of charging twice.
 */
public record ChargeRequest(
        @NotNull @DecimalMin("0.0") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotBlank @Size(max = 100) String idempotencyKey
) {
}
