package com.buddy.eldercompanion.admin;

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
 * Phase 10 integration tests: admin dashboards, buddy verification workflow,
 * audit logging, and ADMIN-only authorization. The admin is the bootstrap
 * account seeded by migration V12.
 */
@AutoConfigureMockMvc
class AdminVerificationIntegrationTest extends AbstractIntegrationTest {

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

    private String loginAdmin() throws Exception {
        String resp = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@buddy.local\",\"password\":\"Admin@12345\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("accessToken").asText();
    }

    private String userId(String token) throws Exception {
        String resp = mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("id").asText();
    }

    @Test
    void adminApprovesBuddyVerificationAndAuditIsRecorded() throws Exception {
        String admin = loginAdmin();
        String buddy = register("admin-buddy@example.com", "BUDDY");
        String buddyId = userId(buddy);
        // Buddy creates a profile (starts PENDING).
        mockMvc.perform(put("/api/v1/profiles/buddy/me")
                        .header("Authorization", "Bearer " + buddy)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"b\",\"skills\":\"cooking\",\"hourlyRate\":120.00,\"yearsExperience\":3,\"available\":true}"))
                .andExpect(status().isOk());

        // Admin sees the buddy among pending verifications.
        mockMvc.perform(get("/api/v1/admin/verifications/pending").param("size", "200")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].userId", org.hamcrest.Matchers.hasItem(buddyId)));

        // Admin approves.
        mockMvc.perform(post("/api/v1/admin/verifications/" + buddyId)
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approve\":true,\"note\":\"docs verified\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("APPROVED"))
                .andExpect(jsonPath("$.verificationNote").value("docs verified"));

        // Audit log records the action.
        mockMvc.perform(get("/api/v1/admin/audit-log").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].action",
                        org.hamcrest.Matchers.hasItem("BUDDY_VERIFICATION_APPROVED")));

        // Buddy was notified of the decision.
        mockMvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].type",
                        org.hamcrest.Matchers.hasItem("VERIFICATION_APPROVED")));

        // Admin can list users.
        mockMvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").isNumber());
    }

    @Test
    void nonAdminCannotAccessAdminEndpoints() throws Exception {
        String elder = register("admin-elder@example.com", "ELDER");
        mockMvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + elder))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/verifications/pending").header("Authorization", "Bearer " + elder))
                .andExpect(status().isForbidden());
    }
}
