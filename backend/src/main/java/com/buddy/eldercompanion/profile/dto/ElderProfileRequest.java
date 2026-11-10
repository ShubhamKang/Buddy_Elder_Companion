package com.buddy.eldercompanion.profile.dto;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ElderProfileRequest(
        @Size(max = 1000) String bio,
        @Past LocalDate dateOfBirth,
        @Size(max = 2000) String medicalNotes,
        @Size(max = 50) String preferredLanguage
) {
}
