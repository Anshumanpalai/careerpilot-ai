package com.careerpilot.dto;

import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String fullName,
        UserRole role,
        String targetRole,
        String avatarUrl,
        Instant createdAt
) {
    public static UserResponse fromEntity(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getTargetRole(),
                user.getAvatarUrl(),
                user.getCreatedAt()
        );
    }
}
