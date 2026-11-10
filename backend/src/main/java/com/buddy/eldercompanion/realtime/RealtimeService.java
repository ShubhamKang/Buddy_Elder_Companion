package com.buddy.eldercompanion.realtime;

import com.buddy.eldercompanion.booking.BookingRepository;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.realtime.dto.ChatMessageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Backs the real-time chat and tracking features: authorizes participants and
 * persists chat history. Live fan-out is handled by the STOMP broker.
 */
@Service
public class RealtimeService {

    private final BookingRepository bookingRepository;
    private final ChatMessageRepository chatMessageRepository;

    public RealtimeService(BookingRepository bookingRepository,
                           ChatMessageRepository chatMessageRepository) {
        this.bookingRepository = bookingRepository;
        this.chatMessageRepository = chatMessageRepository;
    }

    /**
     * Returns true if the user is the elder or buddy on the booking.
     */
    @Transactional(readOnly = true)
    public boolean isParticipant(UUID bookingId, UUID userId) {
        return bookingRepository.existsByIdAndElderId(bookingId, userId)
                || bookingRepository.existsByIdAndBuddyId(bookingId, userId);
    }

    public void requireParticipant(UUID bookingId, UUID userId) {
        if (!isParticipant(bookingId, userId)) {
            // Hide booking existence from non-participants.
            throw new ResourceNotFoundException("Booking not found");
        }
    }

    @Transactional
    public ChatMessageResponse saveMessage(UUID bookingId, UUID senderId, String content) {
        requireParticipant(bookingId, senderId);
        ChatMessage message = ChatMessage.builder()
                .bookingId(bookingId)
                .senderId(senderId)
                .content(content)
                .build();
        return ChatMessageResponse.from(chatMessageRepository.save(message));
    }

    @Transactional(readOnly = true)
    public PageResponse<ChatMessageResponse> history(UUID bookingId, UUID userId, Pageable pageable) {
        requireParticipant(bookingId, userId);
        return PageResponse.from(
                chatMessageRepository.findByBookingIdOrderByCreatedAtAsc(bookingId, pageable),
                ChatMessageResponse::from);
    }
}
