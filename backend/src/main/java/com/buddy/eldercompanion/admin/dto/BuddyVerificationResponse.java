package com.buddy.eldercompanion.admin.dto;

import com.buddy.eldercompanion.profile.BuddyProfile;
import com.buddy.eldercompanion.profile.VerificationStatus;

import java.util.UUID;

public record BuddyVerificationResponse(
        UUID userId,
        String fullName,
        String skills,
        int yearsExperience,
        VerificationStatus verificationStatus,
        String verificationNote
) {
    public static BuddyVerificationResponse from(BuddyProfile p, String fullName) {
        return new BuddyVerificationResponse(p.getUserId(), fullName, p.getSkills(), p.getYearsExperience(),
                p.getVerificationStatus(), p.getVerificationNote());
    }
}
