package com.buddy.eldercompanion.profile.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record BuddyProfileRequest(
        @Size(max = 1000) String bio,
        @Size(max = 500) String skills,
        @DecimalMin("0.0") @Digits(integer = 8, fraction = 2) BigDecimal hourlyRate,
        @Min(0) @Max(80) Integer yearsExperience,
        Boolean available
) {
}
