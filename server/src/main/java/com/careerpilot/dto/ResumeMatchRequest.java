package com.careerpilot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResumeMatchRequest(
        @NotBlank(message = "Job description cannot be blank.")
        @Size(min = 50, max = 50000, message = "Job description must be between 50 and 50,000 characters.")
        String jobDescription
) {
}
