package com.buddy.eldercompanion.sos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmergencyContactRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 30) String phone,
        @Size(max = 50) String relationship
) {
}
