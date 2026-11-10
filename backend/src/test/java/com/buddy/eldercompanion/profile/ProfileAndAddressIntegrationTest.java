package com.buddy.eldercompanion.profile;

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
 * Phase 2 integration tests: elder/buddy profiles and addresses, exercised
 * end-to-end through the real auth flow (JWT) against a PostgreSQL container.
 */
@AutoConfigureMockMvc
class ProfileAndAddressIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String register(String email, String role) throws Exception {
        String body = """
                {"email":"%s","password":"Password123","fullName":"Test User","role":"%s"}
                """.formatted(email, role);
        String resp = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("accessToken").asText();
    }

    @Test
    void elderCanUpsertAndFetchProfile() throws Exception {
        String token = register("elder-p2@example.com", "ELDER");
        String body = """
                {"bio":"Loves gardening","dateOfBirth":"1950-05-20","preferredLanguage":"Hindi"}
                """;
        mockMvc.perform(put("/api/v1/profiles/elder/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("Loves gardening"))
                .andExpect(jsonPath("$.preferredLanguage").value("Hindi"));

        mockMvc.perform(get("/api/v1/profiles/elder/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateOfBirth").value("1950-05-20"));
    }

    @Test
    void buddyCanUpsertProfileAndAppearsInAvailableList() throws Exception {
        String token = register("buddy-p2@example.com", "BUDDY");
        String body = """
                {"bio":"Certified caregiver","skills":"mobility,cooking","hourlyRate":250.00,"yearsExperience":5,"available":true}
                """;
        mockMvc.perform(put("/api/v1/profiles/buddy/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hourlyRate").value(250.00))
                .andExpect(jsonPath("$.yearsExperience").value(5));

        // Available buddy listing is visible to an authenticated elder.
        String elderToken = register("elder-browse@example.com", "ELDER");
        mockMvc.perform(get("/api/v1/profiles/buddy").header("Authorization", "Bearer " + elderToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").isNumber());
    }

    @Test
    void elderCannotCreateBuddyProfile() throws Exception {
        String token = register("elder-wrongrole@example.com", "ELDER");
        String body = """
                {"bio":"x","hourlyRate":100.00,"yearsExperience":1,"available":true}
                """;
        // @PreAuthorize("hasRole('BUDDY')") blocks an elder -> 403.
        mockMvc.perform(put("/api/v1/profiles/buddy/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void addressCrudLifecycleWithPrimaryRule() throws Exception {
        String token = register("addr@example.com", "ELDER");

        // First address is automatically primary.
        String a1 = """
                {"line1":"12 MG Road","city":"Pune","state":"MH","postalCode":"411001","country":"India","primary":false}
                """;
        String created = mockMvc.perform(post("/api/v1/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(a1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.primary").value(true))
                .andReturn().getResponse().getContentAsString();
        String id1 = objectMapper.readTree(created).get("id").asText();

        // Second address requested primary -> becomes primary, first is demoted.
        String a2 = """
                {"line1":"5 FC Road","city":"Pune","primary":true}
                """;
        mockMvc.perform(post("/api/v1/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(a2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.primary").value(true))
                .andExpect(jsonPath("$.country").value("India"));

        // The first address is no longer primary.
        mockMvc.perform(get("/api/v1/addresses/" + id1).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primary").value(false));

        // Listing is paginated.
        mockMvc.perform(get("/api/v1/addresses").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));

        // Delete first address.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/addresses/" + id1).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/addresses/" + id1).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotAccessAnotherUsersAddress() throws Exception {
        String ownerToken = register("owner@example.com", "ELDER");
        String otherToken = register("intruder@example.com", "ELDER");
        String body = """
                {"line1":"Secret 1","city":"Delhi"}
                """;
        String created = mockMvc.perform(post("/api/v1/addresses")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("id").asText();

        mockMvc.perform(get("/api/v1/addresses/" + id).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }
}
