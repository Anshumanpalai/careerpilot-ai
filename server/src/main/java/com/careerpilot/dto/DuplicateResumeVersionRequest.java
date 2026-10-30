package com.careerpilot.dto;

import jakarta.validation.constraints.Size;

public record DuplicateResumeVersionRequest(
        @Size(max = 150, message = "New version name cannot exceed 150 characters")
        String newVersionName,

        @Size(max = 150, message = "Target role cannot exceed 150 characters")
        String targetRole,

        @Size(max = 150, message = "Target company cannot exceed 150 characters")
        String targetCompany
) {}

