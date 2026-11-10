package com.buddy.eldercompanion.realtime;

import com.buddy.eldercompanion.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 5 REST chat tests: message persistence, history ordering and the
 * participant-only authorization rule (no WebSocket transport needed).
 */
@AutoConfigureMockMvc
class ChatRestIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    private String createAcceptedBooking(String elderToken, String buddyToken) throws Exception {
        String resp = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"INSTANT\",\"city\":\"Pune\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(resp).get("id").asText();
        mockMvc.perform(post("/api/v1/bookings/" + id + "/accept")
                        .header("Authorization", "Bearer " + buddyToken))
                .andExpect(status().isOk());
        return id;
    }

    @Test
    void participantsCanSendAndReadHistoryInOrder() throws Exception {
        String elder = register("elder-chat@example.com", "ELDER");
        String buddy = register("buddy-chat@example.com", "BUDDY");
        String bookingId = createAcceptedBooking(elder, buddy);

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/chat")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Hello buddy\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Hello buddy"))
                .andExpect(jsonPath("$.senderId").isNotEmpty());

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/chat")
                        .header("Authorization", "Bearer " + buddy)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"On my way\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/bookings/" + bookingId + "/chat")
                        .header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].content").value("Hello buddy"))
                .andExpect(jsonPath("$.content[1].content").value("On my way"));
    }

    @Test
    void nonParticipantCannotAccessChat() throws Exception {
        String elder = register("elder-chat2@example.com", "ELDER");
        String buddy = register("buddy-chat2@example.com", "BUDDY");
        String outsider = register("outsider-chat@example.com", "BUDDY");
        String bookingId = createAcceptedBooking(elder, buddy);

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/chat")
                        .header("Authorization", "Bearer " + outsider)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"intruder\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/bookings/" + bookingId + "/chat")
                        .header("Authorization", "Bearer " + outsider))
                .andExpect(status().isNotFound());
    }
}
