package com.buddy.eldercompanion.realtime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    Page<ChatMessage> findByBookingIdOrderByCreatedAtAsc(UUID bookingId, Pageable pageable);
}
