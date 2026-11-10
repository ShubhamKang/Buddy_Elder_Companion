package com.buddy.eldercompanion.notification;

import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Periodically delivers unprocessed outbox events through the configured
 * {@link NotificationSender} and marks them processed. This decouples delivery
 * from the request path and survives transient sender failures (unprocessed
 * rows are retried on the next run).
 */
@Component
public class OutboxDispatcher {

    private static final int BATCH_SIZE = 50;

    private final OutboxEventRepository outboxEventRepository;
    private final NotificationSender notificationSender;

    public OutboxDispatcher(OutboxEventRepository outboxEventRepository,
                            NotificationSender notificationSender) {
        this.outboxEventRepository = outboxEventRepository;
        this.notificationSender = notificationSender;
    }

    /**
     * Dispatch a batch of pending events. Returns the number delivered (useful
     * for tests and metrics).
     */
    @Transactional
    public int dispatchPending() {
        List<OutboxEvent> pending = outboxEventRepository
                .findByProcessedFalseOrderByCreatedAtAsc(PageRequest.of(0, BATCH_SIZE));
        for (OutboxEvent event : pending) {
            notificationSender.send(event.getAggregateId(), event.getEventType(), event.getEventType(),
                    event.getPayload());
            event.setProcessed(true);
            event.setProcessedAt(Instant.now());
        }
        outboxEventRepository.saveAll(pending);
        return pending.size();
    }

    @Scheduled(fixedDelayString = "${app.outbox.dispatch-interval-ms:10000}")
    public void scheduledDispatch() {
        dispatchPending();
    }
}
