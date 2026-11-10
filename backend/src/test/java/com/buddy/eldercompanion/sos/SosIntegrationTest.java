package com.buddy.eldercompanion.sos;

import com.buddy.eldercompanion.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 9 integration tests: emergency contacts and one-tap SOS, including the
 * notification fan-out and the elder-only authorization rule.
 */
@AutoConfigureMockMvc
class SosIntegrationTest extends AbstractIntegrationTest {

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

    @Test
    void elderManagesContactsAndRaisesSos() throws Exception {
        String elder = register("sos-elder@example.com", "ELDER");

        // Add two emergency contacts.
        mockMvc.perform(post("/api/v1/sos/contacts")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Daughter\",\"phone\":\"+911111111111\",\"relationship\":\"family\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Daughter"));
        String c2 = mockMvc.perform(post("/api/v1/sos/contacts")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Neighbour\",\"phone\":\"+912222222222\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String contactId = objectMapper.readTree(c2).get("id").asText();

        mockMvc.perform(get("/api/v1/sos/contacts").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        // Raise SOS with location -> alert created, 2 contacts notified.
        String alert = mockMvc.perform(post("/api/v1/sos/alerts")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":18.52,\"longitude\":73.85,\"note\":\"fell down\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.contactsNotified").value(2))
                .andReturn().getResponse().getContentAsString();
        String alertId = objectMapper.readTree(alert).get("id").asText();

        // Elder received an SOS confirmation notification.
        mockMvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].type",
                        org.hamcrest.Matchers.hasItem("SOS_RAISED")));

        // Resolve the alert.
        mockMvc.perform(post("/api/v1/sos/alerts/" + alertId + "/resolve")
                        .header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

        // Resolving again -> 409.
        mockMvc.perform(post("/api/v1/sos/alerts/" + alertId + "/resolve")
                        .header("Authorization", "Bearer " + elder))
                .andExpect(status().isConflict());

        // Delete a contact.
        mockMvc.perform(delete("/api/v1/sos/contacts/" + contactId).header("Authorization", "Bearer " + elder))
                .andExpect(status().isNoContent());
    }

    @Test
    void buddyCannotUseSosEndpoints() throws Exception {
        String buddy = register("sos-buddy@example.com", "BUDDY");
        mockMvc.perform(post("/api/v1/sos/alerts")
                        .header("Authorization", "Bearer " + buddy)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/sos/contacts").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isForbidden());
    }
}
