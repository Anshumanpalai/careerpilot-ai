package com.careerpilot.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ResumeMatchResponse(
        UUID resumeId,
        int jobDescriptionLength,
        int matchScore,
        ScoreBreakdownDto scoringBreakdown,
        List<SkillMatchDto> matchedSkills,
        List<SkillMatchDto> undetectedSkills,
        List<String> recommendations,
        Instant analyzedAt
) {
}
