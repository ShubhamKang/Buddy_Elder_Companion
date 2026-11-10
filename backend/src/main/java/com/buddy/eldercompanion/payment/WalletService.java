package com.buddy.eldercompanion.payment;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.payment.dto.WalletResponse;
import com.buddy.eldercompanion.payment.dto.WalletTransactionResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Manages per-user wallets and their append-only transaction ledger. Every
 * balance change is recorded as an immutable {@link WalletTransaction}.
 */
@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    public WalletService(WalletRepository walletRepository,
                         WalletTransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public Wallet getOrCreate(UUID userId) {
        return walletRepository.findById(userId)
                .orElseGet(() -> walletRepository.save(Wallet.builder()
                        .userId(userId)
                        .balance(BigDecimal.ZERO)
                        .currency("INR")
                        .build()));
    }

    @Transactional
    public void credit(UUID userId, BigDecimal amount, String type, String description, UUID paymentId) {
        Wallet wallet = getOrCreate(userId);
        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);
        transactionRepository.save(WalletTransaction.builder()
                .userId(userId)
                .paymentId(paymentId)
                .direction(TransactionDirection.CREDIT)
                .amount(amount)
                .type(type)
                .description(description)
                .build());
    }

    @Transactional(readOnly = true)
    public WalletResponse view(UUID userId) {
        return WalletResponse.from(getOrCreate(userId));
    }

    @Transactional(readOnly = true)
    public PageResponse<WalletTransactionResponse> transactions(UUID userId, Pageable pageable) {
        return PageResponse.from(
                transactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable),
                WalletTransactionResponse::from);
    }
}
