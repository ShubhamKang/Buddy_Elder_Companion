package com.buddy.eldercompanion.realtime;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import com.buddy.eldercompanion.realtime.dto.ChatMessageRequest;
import com.buddy.eldercompanion.realtime.dto.ChatMessageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST access to a booking's chat: fetch history and send messages (the latter
 * also broadcasts live to subscribers, so HTTP and WebSocket clients interop).
 */
@RestController
@RequestMapping("/api/v1/bookings/{bookingId}/chat")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Chat", description = "Per-booking chat history and messaging")
public class ChatController {

    private final RealtimeService realtimeService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(RealtimeService realtimeService, SimpMessagingTemplate messagingTemplate) {
        this.realtimeService = realtimeService;
        this.messagingTemplate = messagingTemplate;
    }

    @Operation(summary = "Get chat history for a booking (participants only)")
    @GetMapping
    public PageResponse<ChatMessageResponse> history(@PathVariable UUID bookingId, Pageable pageable) {
        return realtimeService.history(bookingId, SecurityUtils.currentUserId(), pageable);
    }

    @Operation(summary = "Send a chat message (participants only)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse send(@PathVariable UUID bookingId,
                                    @Valid @RequestBody ChatMessageRequest request) {
        ChatMessageResponse saved = realtimeService.saveMessage(
                bookingId, SecurityUtils.currentUserId(), request.content());
        messagingTemplate.convertAndSend("/topic/bookings/" + bookingId + "/chat", saved);
        return saved;
    }
}
