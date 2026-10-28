package com.careerpilot.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResumeImprovementRequest(
        @NotBlank(message = "Job description cannot be blank.")
        @Size(min = 50, max = 50000, message = "Job description must be between 50 and 50,000 characters.")
        String jobDescription,

        @NotNull(message = "User consent parameter is required.")
        @AssertTrue(message = "Explicit user consent is required to transmit resume text and job description to an external AI service.")
        Boolean userConsent,

        @Size(max = 150, message = "Target role must not exceed 150 characters.")
        String targetRole
) {
}
