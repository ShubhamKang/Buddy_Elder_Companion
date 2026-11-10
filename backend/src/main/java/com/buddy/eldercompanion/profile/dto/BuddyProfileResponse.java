package com.buddy.eldercompanion.profile.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record BuddyProfileResponse(
        UUID userId,
        String fullName,
        String bio,
        String skills,
        BigDecimal hourlyRate,
        int yearsExperience,
        boolean available,
        BigDecimal ratingAverage,
        int ratingCount,
        String verificationStatus
) {
    public BuddyProfileResponse withFullName(String name) {
        return new BuddyProfileResponse(userId, name, bio, skills, hourlyRate, yearsExperience,
                available, ratingAverage, ratingCount, verificationStatus);
    }
}
