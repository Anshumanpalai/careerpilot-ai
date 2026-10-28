package com.careerpilot.controller;

import com.careerpilot.dto.HealthResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "System operational health checks and diagnostic telemetry")
public class HealthController {

    @Value("${spring.application.name:careerpilot-server}")
    private String applicationName;

    @Value("${app.environment:development}")
    private String environment;

    @GetMapping
    @Operation(
            summary = "Health check",
            description = "Returns current application status, runtime timestamp, and environment metadata."
    )
    @ApiResponse(responseCode = "200", description = "Application is fully operational")
    public ResponseEntity<HealthResponse> checkHealth() {
        HealthResponse response = HealthResponse.up(
                applicationName,
                "0.0.1-SNAPSHOT",
                environment
        );
        return ResponseEntity.ok(response);
    }
}
