package com.buddy.eldercompanion.geo.dto;

import com.buddy.eldercompanion.geo.NearbyBuddyProjection;

import java.math.BigDecimal;
import java.util.UUID;

public record NearbyBuddyResponse(
        UUID userId,
        String fullName,
        String verificationStatus,
        String bio,
        String skills,
        BigDecimal hourlyRate,
        Integer yearsExperience,
        BigDecimal ratingAverage,
        Integer ratingCount,
        Double latitude,
        Double longitude,
        double distanceKm
) {
    public static NearbyBuddyResponse from(NearbyBuddyProjection p) {
        double km = p.getDistanceMeters() == null ? 0.0
                : Math.round(p.getDistanceMeters() / 10.0) / 100.0; // metres -> km, 2dp
        return new NearbyBuddyResponse(
                p.getUserId(), p.getFullName(), p.getVerificationStatus(), p.getBio(), p.getSkills(),
                p.getHourlyRate(), p.getYearsExperience(), p.getRatingAverage(), p.getRatingCount(),
                p.getLatitude(), p.getLongitude(), km);
    }
}
