package com.buddy.eldercompanion.auth.dto;

import com.buddy.eldercompanion.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Registration request. ADMIN accounts are not self-registerable; only ELDER
 * and BUDDY are accepted here (enforced in the service).
 */
public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 150) String fullName,
        @Size(max = 30) String phone,
        @NotNull Role role
) {
}
