package com.careerpilot.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateResumeVersionRequest(
        @NotBlank(message = "Version name cannot be blank")
        @Size(max = 150, message = "Version name cannot exceed 150 characters")
        String versionName,

        @Size(max = 150, message = "Target role cannot exceed 150 characters")
        String targetRole,

        @Size(max = 150, message = "Target company cannot exceed 150 characters")
        String targetCompany,

        @Size(max = 50000, message = "Summary cannot exceed 50,000 characters")
        String summary,

        @Size(max = 50000, message = "Skills cannot exceed 50,000 characters")
        String skills,

        @Size(max = 100000, message = "Experience cannot exceed 100,000 characters")
        String experience,

        @Size(max = 50000, message = "Education cannot exceed 50,000 characters")
        String education,

        @Size(max = 100000, message = "Projects cannot exceed 100,000 characters")
        String projects,

        @Size(max = 50000, message = "Custom sections cannot exceed 50,000 characters")
        String customSections,

        @JsonProperty("isBaseVersion")
        Boolean isBaseVersion
) {}
