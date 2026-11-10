package com.buddy.eldercompanion.payment.provider;

import java.math.BigDecimal;

/**
 * Abstraction over a payment gateway. The dev/demo implementation is a sandbox
 * mock requiring no credentials; a real Razorpay/Stripe adapter can be dropped
 * in later behind this same interface (and selected via configuration).
 */
public interface PaymentProvider {

    /** Provider identifier stored on the payment record (e.g. "MOCK", "RAZORPAY"). */
    String name();

    /** Create and capture a charge in one step (sandbox-friendly). */
    ChargeResult charge(BigDecimal amount, String currency, String idempotencyKey);

    /** Refund a previously captured charge. */
    RefundResult refund(String providerRef, BigDecimal amount);

    record ChargeResult(boolean success, String providerRef, String failureReason) {
        public static ChargeResult ok(String providerRef) {
            return new ChargeResult(true, providerRef, null);
        }
    }

    record RefundResult(boolean success, String providerRef, String failureReason) {
        public static RefundResult ok(String providerRef) {
            return new RefundResult(true, providerRef, null);
        }
    }
}
