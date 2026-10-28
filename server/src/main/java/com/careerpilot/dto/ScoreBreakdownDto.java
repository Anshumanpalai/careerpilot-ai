package com.careerpilot.dto;

import java.util.List;

public record ScoreBreakdownDto(
        int overallScore,
        double requiredMatchRate,
        double preferredMatchRate,
        int matchedRequiredCount,
        int totalRequiredCount,
        int matchedPreferredCount,
        int totalPreferredCount,
        String formulaExplanation,
        List<String> limitations
) {
}
