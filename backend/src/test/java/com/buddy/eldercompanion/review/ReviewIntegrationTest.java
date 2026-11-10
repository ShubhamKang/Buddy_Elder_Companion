package com.buddy.eldercompanion.review;

import com.buddy.eldercompanion.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 6 integration tests: verified-booking-only reviews and aggregate
 * buddy rating recomputation.
 */
@AutoConfigureMockMvc
class ReviewIntegrationTest extends AbstractIntegrationTest {

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

    /** Runs a booking through to COMPLETED and returns its id. */
    private String completedBooking(String elder, String buddy) throws Exception {
        String resp = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"INSTANT\",\"city\":\"Pune\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(resp).get("id").asText();
        mockMvc.perform(post("/api/v1/bookings/" + id + "/accept").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/bookings/" + id + "/start").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/bookings/" + id + "/complete").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());
        return id;
    }

    private String buddyUserId(String buddyToken) throws Exception {
        String resp = mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + buddyToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("id").asText();
    }

    @Test
    void elderReviewsCompletedBookingAndBuddyRatingUpdates() throws Exception {
        String elder = register("elder-rev@example.com", "ELDER");
        String buddy = register("buddy-rev@example.com", "BUDDY");
        // Buddy needs a profile so the aggregate can be stored.
        mockMvc.perform(put("/api/v1/profiles/buddy/me")
                        .header("Authorization", "Bearer " + buddy)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"b\",\"hourlyRate\":100.00,\"yearsExperience\":2,\"available\":true}"))
                .andExpect(status().isOk());

        String bookingId = completedBooking(elder, buddy);
        String buddyId = buddyUserId(buddy);

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/review")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"comment\":\"Very helpful\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(4));

        // The review can be fetched back by booking (so the UI knows it was reviewed).
        mockMvc.perform(get("/api/v1/bookings/" + bookingId + "/review")
                        .header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(4))
                .andExpect(jsonPath("$.comment").value("Very helpful"));
        // ...also visible to the reviewed buddy, but unknown to outsiders.
        mockMvc.perform(get("/api/v1/bookings/" + bookingId + "/review")
                        .header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk());
        String outsider = register("outsider-rev@example.com", "ELDER");
        mockMvc.perform(get("/api/v1/bookings/" + bookingId + "/review")
                        .header("Authorization", "Bearer " + outsider))
                .andExpect(status().isNotFound());

        // Buddy aggregate updated.
        mockMvc.perform(get("/api/v1/profiles/buddy/" + buddyId).header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ratingCount").value(1))
                .andExpect(jsonPath("$.ratingAverage").value(4.00));

        // Review appears in the buddy's review list.
        mockMvc.perform(get("/api/v1/buddies/" + buddyId + "/reviews").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void cannotReviewTwiceOrReviewNonCompletedBooking() throws Exception {
        String elder = register("elder-rev2@example.com", "ELDER");
        String buddy = register("buddy-rev2@example.com", "BUDDY");
        String bookingId = completedBooking(elder, buddy);

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/review")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5}"))
                .andExpect(status().isCreated());
        // Second review for the same booking -> 409.
        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/review")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":3}"))
                .andExpect(status().isConflict());

        // A fresh, non-completed booking cannot be reviewed -> 409.
        String resp = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"INSTANT\",\"city\":\"Pune\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String freshId = objectMapper.readTree(resp).get("id").asText();
        mockMvc.perform(post("/api/v1/bookings/" + freshId + "/review")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5}"))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidRatingRejected() throws Exception {
        String elder = register("elder-rev3@example.com", "ELDER");
        String buddy = register("buddy-rev3@example.com", "BUDDY");
        String bookingId = completedBooking(elder, buddy);
        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/review")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":9}"))
                .andExpect(status().isBadRequest());
    }
}
