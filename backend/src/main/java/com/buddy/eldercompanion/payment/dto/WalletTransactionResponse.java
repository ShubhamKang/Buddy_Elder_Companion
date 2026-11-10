package com.buddy.eldercompanion.payment.dto;

import com.buddy.eldercompanion.payment.TransactionDirection;
import com.buddy.eldercompanion.payment.WalletTransaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletTransactionResponse(
        UUID id,
        TransactionDirection direction,
        BigDecimal amount,
        String type,
        String description,
        Instant createdAt
) {
    public static WalletTransactionResponse from(WalletTransaction t) {
        return new WalletTransactionResponse(t.getId(), t.getDirection(), t.getAmount(),
                t.getType(), t.getDescription(), t.getCreatedAt());
    }
}
