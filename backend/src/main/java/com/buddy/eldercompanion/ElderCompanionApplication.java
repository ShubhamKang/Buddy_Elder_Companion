package com.buddy.eldercompanion;

import com.buddy.eldercompanion.auth.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Buddy Elder Companion backend service.
 */
@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
@EnableScheduling
public class ElderCompanionApplication {

    public static void main(String[] args) {
        SpringApplication.run(ElderCompanionApplication.class, args);
    }
}
