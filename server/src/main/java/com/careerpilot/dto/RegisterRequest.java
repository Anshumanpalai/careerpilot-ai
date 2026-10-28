package com.careerpilot.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 100, message = "Full name must be at most 100 characters")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "A valid email address is required")
        @Size(max = 150, message = "Email must be at most 150 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        String password,

        @Size(max = 100, message = "Target role must be at most 100 characters")
        String targetRole
) {
    public RegisterRequest {
        email = email != null ? email.trim() : null;
        fullName = fullName != null ? fullName.trim() : null;
        targetRole = targetRole != null ? targetRole.trim() : null;
    }
}
