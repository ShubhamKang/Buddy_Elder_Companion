package com.buddy.eldercompanion.web;

import com.buddy.eldercompanion.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Locks in what the browser UI depends on: CORS preflight for the dev origin,
 * and display names in booking / buddy / nearby responses.
 */
@AutoConfigureMockMvc
class UiContractIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String register(String email, String role, String name) throws Exception {
        String body = """
                {"email":"%s","password":"Password123","fullName":"%s","role":"%s"}
                """.formatted(email, name, role);
        String resp = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("accessToken").asText();
    }

    @Test
    void corsPreflightIsAllowedForTheDevOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/bookings")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    @Test
    void corsPreflightIsRejectedForUnknownOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/bookings")
                        .header("Origin", "http://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    // NOTE: uses Sydney coordinates so it never overlaps the Pune-based assertions in
    // GeoMatchingIntegrationTest (all test classes share one database).
    @Test
    void bookingBuddyAndNearbyResponsesCarryNames() throws Exception {
        String elder = register("ui-elder@example.com", "ELDER", "Asha Verma");
        String buddy = register("ui-buddy@example.com", "BUDDY", "Ravi Kumar");

        mockMvc.perform(put("/api/v1/profiles/buddy/me")
                        .header("Authorization", "Bearer " + buddy)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"b\",\"skills\":\"cooking\",\"hourlyRate\":150.00,\"yearsExperience\":3,\"available\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Ravi Kumar"))
                .andExpect(jsonPath("$.verificationStatus").value("PENDING"));
        mockMvc.perform(put("/api/v1/buddies/me/location")
                        .header("Authorization", "Bearer " + buddy)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":-33.87,\"longitude\":151.21}"))
                .andExpect(status().isNoContent());

        // Nearby search includes name + verification status.
        mockMvc.perform(get("/api/v1/buddies/nearby")
                        .header("Authorization", "Bearer " + elder)
                        .param("lat", "-33.8688").param("lng", "151.2093").param("radiusKm", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.fullName=='Ravi Kumar')].verificationStatus").isNotEmpty());

        // Available-buddy list includes names.
        mockMvc.perform(get("/api/v1/profiles/buddy").param("size", "200")
                        .header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].fullName", org.hamcrest.Matchers.hasItem("Ravi Kumar")));

        // Booking carries both names once accepted.
        String created = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"INSTANT\",\"city\":\"Pune\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.elderName").value("Asha Verma"))
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("id").asText();
        mockMvc.perform(post("/api/v1/bookings/" + id + "/accept").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.buddyName").value("Ravi Kumar"))
                .andExpect(jsonPath("$.elderName").value("Asha Verma"));
        mockMvc.perform(get("/api/v1/bookings/mine/buddy").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].elderName").value("Asha Verma"));
    }
}
