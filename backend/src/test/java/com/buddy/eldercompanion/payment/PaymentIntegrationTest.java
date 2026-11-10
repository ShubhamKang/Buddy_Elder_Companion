package com.buddy.eldercompanion.payment;

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
 * Phase 7 integration tests: idempotent charging, refunds crediting the wallet,
 * and duplicate-payment protection, via the sandbox mock provider.
 */
@AutoConfigureMockMvc
class PaymentIntegrationTest extends AbstractIntegrationTest {

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

    private String createBooking(String elder) throws Exception {
        String resp = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"INSTANT\",\"city\":\"Pune\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(resp).get("id").asText();
    }

    @Test
    void chargeIsIdempotentForSameKey() throws Exception {
        String elder = register("pay-elder@example.com", "ELDER");
        String bookingId = createBooking(elder);

        String body = """
                {"amount":500.00,"idempotencyKey":"key-abc-1"}
                """;
        String first = mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/payment")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CAPTURED"))
                .andExpect(jsonPath("$.providerRef").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String firstId = objectMapper.readTree(first).get("id").asText();

        // Same idempotency key -> same payment, no second charge.
        String second = mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/payment")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String secondId = objectMapper.readTree(second).get("id").asText();

        org.assertj.core.api.Assertions.assertThat(secondId).isEqualTo(firstId);
    }

    @Test
    void refundCreditsWallet() throws Exception {
        String elder = register("pay-elder2@example.com", "ELDER");
        String bookingId = createBooking(elder);

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/payment")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":300.00,\"idempotencyKey\":\"key-refund-1\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/payment/refund")
                        .header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REFUNDED"));

        // Wallet now holds the refunded amount.
        mockMvc.perform(get("/api/v1/wallet").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(300.00));

        mockMvc.perform(get("/api/v1/wallet/transactions").header("Authorization", "Bearer " + elder))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].direction").value("CREDIT"))
                .andExpect(jsonPath("$.content[0].type").value("REFUND"));
    }

    @Test
    void cannotRefundUncapturedAndCannotDoublePay() throws Exception {
        String elder = register("pay-elder3@example.com", "ELDER");
        String bookingId = createBooking(elder);

        // Refund before any payment -> 404.
        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/payment/refund")
                        .header("Authorization", "Bearer " + elder))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/payment")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":200.00,\"idempotencyKey\":\"key-dbl-1\"}"))
                .andExpect(status().isCreated());

        // A different key for the same booking -> rejected (already paid).
        mockMvc.perform(post("/api/v1/bookings/" + bookingId + "/payment")
                        .header("Authorization", "Bearer " + elder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":200.00,\"idempotencyKey\":\"key-dbl-2\"}"))
                .andExpect(status().isConflict());
    }
}
