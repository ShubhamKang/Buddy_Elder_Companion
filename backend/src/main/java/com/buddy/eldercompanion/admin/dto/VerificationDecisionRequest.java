package com.buddy.eldercompanion.admin.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Admin's approve/reject decision for a buddy's verification.
 */
public record VerificationDecisionRequest(
        @NotNull Boolean approve,
        @Size(max = 500) String note
) {
}
