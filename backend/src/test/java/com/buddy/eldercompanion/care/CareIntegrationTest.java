package com.buddy.eldercompanion.care;

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
 * Phase 11 integration tests: reminders, recurring care plans and the scheduled
 * sweeper that fires due notifications.
 */
@AutoConfigureMockMvc
class CareIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CareService careService;

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
    void dueReminderAndCarePlanFireNotificationsViaSweep() throws Exception {
        String elder = register("care-elder@example.com", "ELDER");

        // A reminder due in the past.
        mockMvc.perform(post("/api/v1/care/reminders")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"MEDICATION\",\"message\":\"Take BP pill\",\"remindAt\":\"2000-01-01T08:00:00Z\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sent").value(false));

        // A care plan whose first run is in the past.
        String plan = mockMvc.perform(post("/api/v1/care/plans")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Daily medicine visit\",\"cadence\":\"DAILY\",\"firstRunAt\":\"2000-01-01T08:00:00Z\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.active").value(true))
                .andReturn().getResponse().getContentAsString();
        String planNextRunBefore = objectMapper.readTree(plan).get("nextRunAt").asText();

        // Run the sweeper -> at least our reminder + care plan fire.
        int fired = careService.sweep();
        assertThat(fired).isGreaterThanOrEqualTo(2);

        // Elder received both notification types.
        mockMvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].type",
                        org.hamcrest.Matchers.hasItem("REMINDER_MEDICATION")))
                .andExpect(jsonPath("$.content[*].type",
                        org.hamcrest.Matchers.hasItem("CARE_PLAN")));

        // Reminder is now marked sent.
        mockMvc.perform(get("/api/v1/care/reminders").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].sent").value(true));

        // Care plan's nextRunAt advanced (recurs).
        String plans = mockMvc.perform(get("/api/v1/care/plans").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String planNextRunAfter = objectMapper.readTree(plans).get(0).get("nextRunAt").asText();
        assertThat(planNextRunAfter).isNotEqualTo(planNextRunBefore);
    }

    @Test
    void buddyCannotUseCareEndpoints() throws Exception {
        String buddy = register("care-buddy@example.com", "BUDDY");
        mockMvc.perform(get("/api/v1/care/reminders").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/care/plans").header("Authorization", "Bearer " + buddy))
                .andExpect(status().isForbidden());
    }
}
