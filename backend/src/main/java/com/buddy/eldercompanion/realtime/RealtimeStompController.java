package com.buddy.eldercompanion.realtime;

import com.buddy.eldercompanion.realtime.dto.ChatMessageRequest;
import com.buddy.eldercompanion.realtime.dto.ChatMessageResponse;
import com.buddy.eldercompanion.realtime.dto.LocationPing;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * Handles inbound STOMP frames for a booking's chat and live tracking, then
 * broadcasts to the per-booking topics that participants subscribe to:
 * <ul>
 *   <li>SEND /app/bookings/{id}/chat     -&gt; /topic/bookings/{id}/chat</li>
 *   <li>SEND /app/bookings/{id}/location -&gt; /topic/bookings/{id}/location</li>
 * </ul>
 */
@Controller
public class RealtimeStompController {

    private final RealtimeService realtimeService;
    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeStompController(RealtimeService realtimeService,
                                   SimpMessagingTemplate messagingTemplate) {
        this.realtimeService = realtimeService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/bookings/{bookingId}/chat")
    public void chat(@DestinationVariable UUID bookingId,
                     @Payload ChatMessageRequest request,
                     Principal principal) {
        UUID senderId = UUID.fromString(principal.getName());
        ChatMessageResponse saved = realtimeService.saveMessage(bookingId, senderId, request.content());
        messagingTemplate.convertAndSend("/topic/bookings/" + bookingId + "/chat", saved);
    }

    @MessageMapping("/bookings/{bookingId}/location")
    public void location(@DestinationVariable UUID bookingId,
                         @Payload LocationPing ping,
                         Principal principal) {
        UUID senderId = UUID.fromString(principal.getName());
        realtimeService.requireParticipant(bookingId, senderId);
        LocationPing broadcast = LocationPing.broadcast(ping.latitude(), ping.longitude(), senderId);
        messagingTemplate.convertAndSend("/topic/bookings/" + bookingId + "/location", broadcast);
    }
}
