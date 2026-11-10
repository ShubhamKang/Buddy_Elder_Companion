package com.buddy.eldercompanion.notification;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import com.buddy.eldercompanion.notification.dto.NotificationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * In-app notification endpoints for the current user.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Notifications", description = "In-app notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Operation(summary = "List the current user's notifications (newest first)")
    @GetMapping
    public PageResponse<NotificationResponse> list(Pageable pageable) {
        return notificationService.list(SecurityUtils.currentUserId(), pageable);
    }

    @Operation(summary = "Count the current user's unread notifications")
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("unread", notificationService.unreadCount(SecurityUtils.currentUserId()));
    }

    @Operation(summary = "Mark a notification read")
    @PostMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable UUID id) {
        return notificationService.markRead(SecurityUtils.currentUserId(), id);
    }
}
