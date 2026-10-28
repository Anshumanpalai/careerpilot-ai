package com.careerpilot.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ResumeImprovementResponse(
        UUID id,
        UUID resumeId,
        String targetRole,
        String providerName,
        String modelName,
        SummaryImprovementDto improvedSummary,
        List<BulletSuggestionDto> bulletPointSuggestions,
        List<EvidencedSkillDto> evidencedSkills,
        List<LearningGapDto> learningGaps,
        List<RecommendationDto> prioritizedRecommendations,
        List<RoadmapItemDto> learningRoadmap,
        String complianceNotice,
        Instant createdAt
) {
}
