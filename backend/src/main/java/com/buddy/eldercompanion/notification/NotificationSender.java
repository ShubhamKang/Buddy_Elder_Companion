package com.buddy.eldercompanion.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.UUID;

/**
 * Pluggable out-of-band delivery channel (email/SMS/push). The dev/default
 * implementation simply logs — free, no provider account required. A real
 * email/SMS sender can be dropped in as another {@link NotificationSender} bean.
 */
public interface NotificationSender {

    void send(UUID userId, String type, String title, String body);

    @Configuration
    class LogNotificationSenderConfig {

        @Bean
        @ConditionalOnMissingBean(NotificationSender.class)
        public NotificationSender logNotificationSender() {
            Logger log = LoggerFactory.getLogger("NotificationSender");
            return (userId, type, title, body) ->
                    log.info("[NOTIFY] user={} type={} title='{}' body='{}'", userId, type, title, body);
        }
    }
}
