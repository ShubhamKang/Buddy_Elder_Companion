package com.buddy.eldercompanion.booking;

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
 * Phase 3 integration tests: the full booking lifecycle and guard rules,
 * exercised through the real auth flow against a PostgreSQL container.
 */
@AutoConfigureMockMvc
class BookingLifecycleIntegrationTest extends AbstractIntegrationTest {

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

    private String createInstantBooking(String elderToken) throws Exception {
        String body = """
                {"type":"INSTANT","serviceNotes":"Need help with groceries","addressLine":"1 Main St","city":"Pune"}
                """;
        String resp = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elderToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.type").value("INSTANT"))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("id").asText();
    }

    @Test
    void fullHappyPathRequestAcceptStartComplete() throws Exception {
        String elder = register("elder-bk@example.com", "ELDER");
        String buddy = register("buddy-bk@example.com", "BUDDY");
        String id = createInstantBooking(elder);

        // Buddy sees this booking among the open requests (DB may hold others
        // from parallel test classes, so assert presence rather than exact count).
        mockMvc.perform(get("/api/v1/bookings/open").param("size", "200")
                        .header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", org.hamcrest.Matchers.hasItem(id)));

        // accept -> start -> complete
        mockMvc.perform(post("/api/v1/bookings/" + id + "/accept").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.buddyId").isNotEmpty());
        mockMvc.perform(post("/api/v1/bookings/" + id + "/start").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.startedAt").isNotEmpty());
        mockMvc.perform(post("/api/v1/bookings/" + id + "/complete").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.completedAt").isNotEmpty());
    }

    @Test
    void illegalTransitionIsRejected() throws Exception {
        String elder = register("elder-bk2@example.com", "ELDER");
        String buddy = register("buddy-bk2@example.com", "BUDDY");
        String id = createInstantBooking(elder);

        // Cannot start a booking that was never accepted -> 409 Conflict.
        mockMvc.perform(post("/api/v1/bookings/" + id + "/start").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isNotFound()); // not assigned to this buddy yet

        mockMvc.perform(post("/api/v1/bookings/" + id + "/accept").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());
        // Now complete without starting -> illegal transition 409.
        mockMvc.perform(post("/api/v1/bookings/" + id + "/complete").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isConflict());
    }

    @Test
    void elderCanCancelAndCannotActAsBuddy() throws Exception {
        String elder = register("elder-bk3@example.com", "ELDER");
        String id = createInstantBooking(elder);

        // Elder cancels own booking.
        mockMvc.perform(post("/api/v1/bookings/" + id + "/cancel")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"changed mind\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("changed mind"));

        // Elder cannot call a buddy-only endpoint -> 403.
        mockMvc.perform(post("/api/v1/bookings/" + id + "/accept").header("Authorization", "Bearer " + elder))
                .andExpect(status().isForbidden());
    }

    @Test
    void scheduledBookingRequiresFutureTime() throws Exception {
        String elder = register("elder-bk4@example.com", "ELDER");
        // Missing scheduledAt for SCHEDULED -> 409 business rule.
        String body = """
                {"type":"SCHEDULED","serviceNotes":"doctor visit","city":"Pune"}
                """;
        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());

        // Valid future scheduledAt succeeds.
        String ok = """
                {"type":"SCHEDULED","serviceNotes":"doctor visit","city":"Pune","scheduledAt":"2999-01-01T10:00:00Z"}
                """;
        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content(ok))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.scheduledAt").isNotEmpty());
    }
}
