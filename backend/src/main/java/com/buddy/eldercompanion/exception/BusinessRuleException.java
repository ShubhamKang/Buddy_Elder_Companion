package com.buddy.eldercompanion.exception;

/**
 * Thrown when a request violates a business rule (e.g., illegal state
 * transition, duplicate registration). Maps to HTTP 409 / 400.
 */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
