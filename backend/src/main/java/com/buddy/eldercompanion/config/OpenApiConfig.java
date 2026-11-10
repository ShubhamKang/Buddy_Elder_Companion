package com.buddy.eldercompanion.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger UI metadata, including the JWT bearer security scheme
 * introduced in Phase 1.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI elderCompanionOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Buddy Elder Companion API")
                        .description("Backend service connecting elders with buddy companions.")
                        .version("0.0.1-SNAPSHOT")
                        .contact(new Contact().name("Buddy Elder Companion"))
                        .license(new License().name("MIT")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
