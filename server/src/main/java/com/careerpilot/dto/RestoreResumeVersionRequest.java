package com.careerpilot.dto;

import jakarta.validation.constraints.Size;

public record RestoreResumeVersionRequest(
        @Size(max = 150, message = "New version name cannot exceed 150 characters")
        String newVersionName
) {}

