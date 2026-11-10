package com.buddy.eldercompanion.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Lightweight liveness endpoint used for smoke tests and uptime checks.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "System", description = "Service health and metadata")
public class PingController {

    @Operation(summary = "Ping the service", description = "Returns a simple liveness response.")
    @GetMapping("/ping")
    public Map<String, Object> ping() {
        return Map.of(
                "status", "UP",
                "service", "elder-companion",
                "timestamp", Instant.now().toString());
    }
}
