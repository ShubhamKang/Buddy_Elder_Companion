package com.buddy.eldercompanion.profile.dto;

import java.time.LocalDate;
import java.util.UUID;

public record ElderProfileResponse(
        UUID userId,
        String bio,
        LocalDate dateOfBirth,
        String medicalNotes,
        String preferredLanguage
) {
}
