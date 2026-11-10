package com.buddy.eldercompanion.admin.dto;

import com.buddy.eldercompanion.user.Role;
import com.buddy.eldercompanion.user.User;

import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String email,
        String fullName,
        Role role,
        String status,
        Instant createdAt
) {
    public static AdminUserResponse from(User u) {
        return new AdminUserResponse(u.getId(), u.getEmail(), u.getFullName(),
                u.getRole(), u.getStatus().name(), u.getCreatedAt());
    }
}
