package com.careerpilot.dto;

public record LearningGapDto(
        String missingRequirement,
        String importance,
        String reason
) {
}
