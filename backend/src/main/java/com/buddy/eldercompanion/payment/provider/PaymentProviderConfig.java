package com.buddy.eldercompanion.payment.provider;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Wires the default (sandbox) {@link PaymentProvider}. The mock requires no API
 * keys and always succeeds, generating fake references. Define another
 * {@link PaymentProvider} bean (e.g. a real Razorpay adapter) to override it.
 */
@Configuration
public class PaymentProviderConfig {

    @Bean
    @ConditionalOnMissingBean(PaymentProvider.class)
    public PaymentProvider paymentProvider() {
        return new PaymentProvider() {
            @Override
            public String name() {
                return "MOCK";
            }

            @Override
            public ChargeResult charge(BigDecimal amount, String currency, String idempotencyKey) {
                return ChargeResult.ok("mock_pay_" + UUID.randomUUID());
            }

            @Override
            public RefundResult refund(String providerRef, BigDecimal amount) {
                return RefundResult.ok("mock_rfnd_" + UUID.randomUUID());
            }
        };
    }
}
