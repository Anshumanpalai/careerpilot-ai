package com.careerpilot.dto;

import com.careerpilot.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
        @NotNull(message = "Application status is required")
        ApplicationStatus status
) {
}
