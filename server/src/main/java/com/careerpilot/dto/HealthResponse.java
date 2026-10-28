package com.careerpilot.dto;

import java.time.Instant;

public record HealthResponse(
        String status,
        String app,
        String version,
        Instant timestamp,
        String environment
) {
    public static HealthResponse up(String appName, String version, String environment) {
        return new HealthResponse("UP", appName, version, Instant.now(), environment);
    }
}
