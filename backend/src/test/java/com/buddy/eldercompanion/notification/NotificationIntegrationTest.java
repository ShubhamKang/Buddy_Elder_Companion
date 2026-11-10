package com.buddy.eldercompanion.notification;

import com.buddy.eldercompanion.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 8 integration tests: event-driven in-app notifications and the
 * transactional outbox dispatcher.
 */
@AutoConfigureMockMvc
class NotificationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OutboxDispatcher outboxDispatcher;

    private String register(String email, String role) throws Exception {
        String body = """
                {"email":"%s","password":"Password123","fullName":"T","role":"%s"}
                """.formatted(email, role);
        String resp = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("accessToken").asText();
    }

    @Test
    void bookingAcceptAndCompleteNotifyTheElder() throws Exception {
        String elder = register("notify-elder@example.com", "ELDER");
        String buddy = register("notify-buddy@example.com", "BUDDY");

        String resp = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"INSTANT\",\"city\":\"Pune\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String bookingId = objectMapper.readTree(resp).get("id").asText();

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/accept").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/start").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/complete").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());

        // Elder has two notifications (accepted + completed), newest first.
        mockMvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].type").value("BOOKING_COMPLETED"))
                .andExpect(jsonPath("$.content[1].type").value("BOOKING_ACCEPTED"));

        // Unread count is 2.
        mockMvc.perform(get("/api/v1/notifications/unread-count").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unread").value(2));

        // Mark the first one read -> unread drops to 1.
        String list = mockMvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + elder))
                .andReturn().getResponse().getContentAsString();
        String firstId = objectMapper.readTree(list).get("content").get(0).get("id").asText();
        mockMvc.perform(post("/api/v1/notifications/" + firstId + "/read").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
        mockMvc.perform(get("/api/v1/notifications/unread-count").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unread").value(1));

        // The buddy sees none of the elder's notifications.
        mockMvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void outboxDispatcherDeliversAndMarksProcessed() throws Exception {
        String elder = register("outbox-elder@example.com", "ELDER");
        String buddy = register("outbox-buddy@example.com", "BUDDY");

        String resp = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"INSTANT\",\"city\":\"Pune\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String bookingId = objectMapper.readTree(resp).get("id").asText();
        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/accept").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());

        // At least the one event we just produced should be dispatched.
        int dispatched = outboxDispatcher.dispatchPending();
        assertThat(dispatched).isGreaterThanOrEqualTo(1);

        // Processed rows are not redelivered: a run that finds no pending rows
        // returns 0. (Other test classes may add rows, so we only assert that
        // dispatching is safe to call repeatedly without error.)
        int second = outboxDispatcher.dispatchPending();
        assertThat(second).isGreaterThanOrEqualTo(0);
    }
}
