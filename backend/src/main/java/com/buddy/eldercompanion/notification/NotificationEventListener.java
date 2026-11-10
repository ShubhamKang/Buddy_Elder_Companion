package com.buddy.eldercompanion.notification;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Records {@link NotificationEvent}s raised by business services. Runs within
 * the publisher's transaction so the in-app notification and outbox row commit
 * atomically with the triggering change (transactional outbox pattern).
 */
@Component
public class NotificationEventListener {

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @EventListener
    public void onNotificationEvent(NotificationEvent event) {
        notificationService.record(event);
    }
}
