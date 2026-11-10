package com.buddy.eldercompanion.notification;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.notification.dto.NotificationResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Persists and serves in-app notifications, and records matching outbox rows for
 * out-of-band delivery — both written in the same transaction as handling a
 * {@link NotificationEvent}.
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final OutboxEventRepository outboxEventRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               OutboxEventRepository outboxEventRepository) {
        this.notificationRepository = notificationRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @Transactional
    public void record(NotificationEvent event) {
        notificationRepository.save(Notification.builder()
                .userId(event.userId())
                .type(event.type())
                .title(event.title())
                .body(event.body())
                .read(false)
                .build());
        outboxEventRepository.save(OutboxEvent.builder()
                .aggregateType("NOTIFICATION")
                .aggregateId(event.aggregateId())
                .eventType(event.type())
                .payload(buildPayload(event))
                .processed(false)
                .build());
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(UUID userId, Pageable pageable) {
        return PageResponse.from(
                notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable),
                NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public NotificationResponse markRead(UUID userId, UUID notificationId) {
        Notification n = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        n.setRead(true);
        return NotificationResponse.from(notificationRepository.save(n));
    }

    private String buildPayload(NotificationEvent event) {
        // Compact, dependency-free payload. A real impl might store JSON.
        return "user=" + event.userId()
                + ";type=" + event.type()
                + ";title=" + event.title()
                + ";body=" + (event.body() == null ? "" : event.body())
                + ";at=" + Instant.now();
    }
}
