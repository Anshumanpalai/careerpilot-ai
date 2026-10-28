package com.careerpilot.dto;

public record RecommendationDto(
        String priority,
        String title,
        String actionableAdvice
) {
}
