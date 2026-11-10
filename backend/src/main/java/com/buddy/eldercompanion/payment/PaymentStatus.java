package com.buddy.eldercompanion.payment;

/**
 * Payment lifecycle status.
 */
public enum PaymentStatus {
    CREATED,
    AUTHORIZED,
    CAPTURED,
    REFUNDED,
    FAILED
}
