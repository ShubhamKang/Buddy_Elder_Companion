package com.buddy.eldercompanion.notification;

import java.util.UUID;

/**
 * A domain event signalling that a user should be notified. Published via
 * Spring's {@code ApplicationEventPublisher} by business services (booking,
 * payment, SOS, ...). Handled after the publishing transaction commits.
 *
 * @param userId recipient
 * @param type   machine-readable category (e.g. BOOKING_ACCEPTED)
 * @param title  short human-readable title
 * @param body   optional detail
 * @param aggregateId related entity id (booking, payment, ...), may be null
 */
public record NotificationEvent(
        UUID userId,
        String type,
        String title,
        String body,
        UUID aggregateId
) {
}
