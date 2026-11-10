package com.buddy.eldercompanion.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Helpers for reading the authenticated principal. The JWT filter stores the
 * user's id (UUID) as the authentication name.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalStateException("No authenticated user in context");
        }
        return UUID.fromString(authentication.getName());
    }
}
