package com.careerpilot.dto;

import java.util.List;

public record RoadmapItemDto(
        String skill,
        List<String> actionSteps,
        String estimatedTimeToAcquire,
        List<String> recommendedTopics
) {
}
