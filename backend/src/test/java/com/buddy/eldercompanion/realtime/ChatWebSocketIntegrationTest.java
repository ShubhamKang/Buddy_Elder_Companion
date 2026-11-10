package com.buddy.eldercompanion.realtime;

import com.buddy.eldercompanion.AbstractIntegrationTest;
import com.buddy.eldercompanion.realtime.dto.ChatMessageRequest;
import com.buddy.eldercompanion.realtime.dto.ChatMessageResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 5 live WebSocket test: connects a real STOMP client over the network,
 * subscribes to a booking's chat topic, sends a frame via /app, and asserts the
 * message is delivered live to subscribers.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChatWebSocketIntegrationTest extends AbstractIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    private final RestTemplate rest = new RestTemplate();

    private String register(String email, String role) {
        String body = """
                {"email":"%s","password":"Password123","fullName":"T","role":"%s"}
                """.formatted(email, role);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<?, ?> resp = rest.postForObject(
                "http://localhost:" + port + "/api/v1/auth/register",
                new HttpEntity<>(body, headers), Map.class);
        return (String) resp.get("accessToken");
    }

    private String post(String url, String token, String json) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return rest.postForObject("http://localhost:" + port + url, new HttpEntity<>(json, headers), String.class);
    }

    @Test
    void messageSentOverStompIsDeliveredToSubscriber() throws Exception {
        String elder = register("ws-elder@example.com", "ELDER");
        String buddy = register("ws-buddy@example.com", "BUDDY");

        String bookingResp = post("/api/v1/bookings", elder, "{\"type\":\"INSTANT\",\"city\":\"Pune\"}");
        String bookingId = objectMapper.readTree(bookingResp).get("id").asText();
        post("/api/v1/bookings/" + bookingId + "/accept", buddy, "");

        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(new com.fasterxml.jackson.databind.ObjectMapper()
                .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule()));
        client.setMessageConverter(converter);

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + elder);

        java.util.concurrent.atomic.AtomicReference<Throwable> error = new java.util.concurrent.atomic.AtomicReference<>();
        StompSessionHandlerAdapter errorAware = new StompSessionHandlerAdapter() {
            @Override
            public void handleException(@NonNull StompSession s, StompCommand command,
                                        @NonNull StompHeaders headers, @NonNull byte[] payload, @NonNull Throwable ex) {
                error.set(ex);
            }

            @Override
            public void handleTransportError(@NonNull StompSession s, @NonNull Throwable ex) {
                error.set(ex);
            }
        };

        StompSession session = client.connectAsync(
                        "ws://localhost:" + port + "/ws",
                        new org.springframework.web.socket.WebSocketHttpHeaders(),
                        connectHeaders,
                        errorAware)
                .get(5, TimeUnit.SECONDS);

        LinkedBlockingDeque<ChatMessageResponse> received = new LinkedBlockingDeque<>();
        session.subscribe("/topic/bookings/" + bookingId + "/chat", new StompSessionHandlerAdapter() {
            @Override
            @NonNull
            public Type getPayloadType(@NonNull StompHeaders headers) {
                return ChatMessageResponse.class;
            }

            @Override
            public void handleFrame(@NonNull StompHeaders headers, Object payload) {
                received.offer((ChatMessageResponse) payload);
            }
        });

        // Give the subscription a moment to register, then send.
        Thread.sleep(500);
        session.send("/app/bookings/" + bookingId + "/chat", new ChatMessageRequest("live hello"));

        ChatMessageResponse msg = received.poll(5, TimeUnit.SECONDS);
        assertThat(error.get()).as("stomp error").isNull();
        assertThat(msg).isNotNull();
        assertThat(msg.content()).isEqualTo("live hello");

        session.disconnect();
        client.stop();
    }
}
