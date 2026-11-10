package com.buddy.eldercompanion.payment.dto;

import com.buddy.eldercompanion.payment.Wallet;

import java.math.BigDecimal;
import java.util.UUID;

public record WalletResponse(
        UUID userId,
        BigDecimal balance,
        String currency
) {
    public static WalletResponse from(Wallet w) {
        return new WalletResponse(w.getUserId(), w.getBalance(), w.getCurrency());
    }
}
