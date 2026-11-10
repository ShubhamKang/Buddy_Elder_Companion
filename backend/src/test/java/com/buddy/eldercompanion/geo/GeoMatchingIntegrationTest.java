package com.buddy.eldercompanion.geo;

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
 * Phase 4 integration tests: PostGIS-backed nearby-buddy search. Buddies are
 * placed at known coordinates and searched by radius/distance.
 */
@AutoConfigureMockMvc
class GeoMatchingIntegrationTest extends AbstractIntegrationTest {

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

    private void createBuddyWithLocation(String email, double lat, double lng) throws Exception {
        String token = register(email, "BUDDY");
        mockMvc.perform(put("/api/v1/profiles/buddy/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"b\",\"hourlyRate\":100.00,\"yearsExperience\":2,\"available\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/buddies/me/location")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":%s,\"longitude\":%s}".formatted(lat, lng)))
                .andExpect(status().isNoContent());
    }

    @Test
    void nearbySearchReturnsBuddiesWithinRadiusSortedByDistance() throws Exception {
        // Reference point: Pune (18.5204, 73.8567).
        // Near buddy ~2km away; far buddy ~50km away (Lonavala-ish).
        createBuddyWithLocation("near-buddy@example.com", 18.5300, 73.8700);
        createBuddyWithLocation("far-buddy@example.com", 18.7500, 73.4000);

        String elder = register("elder-geo@example.com", "ELDER");

        // 10km radius -> only the near buddy.
        mockMvc.perform(get("/api/v1/buddies/nearby")
                        .header("Authorization", "Bearer " + elder)
                        .param("lat", "18.5204").param("lng", "73.8567").param("radiusKm", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].userId").isNotEmpty())
                .andExpect(jsonPath("$[0].distanceKm").isNumber());

        // 100km radius -> both, nearest first.
        mockMvc.perform(get("/api/v1/buddies/nearby")
                        .header("Authorization", "Bearer " + elder)
                        .param("lat", "18.5204").param("lng", "73.8567").param("radiusKm", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].distanceKm").value(org.hamcrest.Matchers.lessThan(
                        ((Number) 20).doubleValue())));
    }

    @Test
    void unavailableOrLocationlessBuddiesAreExcluded() throws Exception {
        // Buddy with a profile but no location set.
        String token = register("noloc-buddy@example.com", "BUDDY");
        mockMvc.perform(put("/api/v1/profiles/buddy/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"b\",\"hourlyRate\":100.00,\"yearsExperience\":2,\"available\":true}"))
                .andExpect(status().isOk());

        String elder = register("elder-geo2@example.com", "ELDER");
        mockMvc.perform(get("/api/v1/buddies/nearby")
                        .header("Authorization", "Bearer " + elder)
                        .param("lat", "18.5204").param("lng", "73.8567").param("radiusKm", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void invalidRadiusIsRejected() throws Exception {
        String elder = register("elder-geo3@example.com", "ELDER");
        mockMvc.perform(get("/api/v1/buddies/nearby")
                        .header("Authorization", "Bearer " + elder)
                        .param("lat", "18.5204").param("lng", "73.8567").param("radiusKm", "500"))
                .andExpect(status().isConflict());
    }

    @Test
    void elderCannotPublishBuddyLocation() throws Exception {
        String elder = register("elder-geo4@example.com", "ELDER");
        mockMvc.perform(put("/api/v1/buddies/me/location")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":18.5,\"longitude\":73.8}"))
                .andExpect(status().isForbidden());
    }
}
