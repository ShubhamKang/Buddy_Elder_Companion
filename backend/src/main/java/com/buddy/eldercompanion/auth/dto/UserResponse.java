package com.buddy.eldercompanion.auth.dto;

import com.buddy.eldercompanion.user.Role;
import com.buddy.eldercompanion.user.User;

import java.util.UUID;

/**
 * Safe view of a user account (never exposes the password hash).
 */
public record UserResponse(
        UUID id,
        String email,
        String fullName,
        String phone,
        Role role,
        String status
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getRole(),
                user.getStatus().name());
    }
}
