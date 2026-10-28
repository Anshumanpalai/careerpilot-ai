package com.careerpilot.dto;

public record AuthResponse(
        String token,
        UserResponse user
) {
}
