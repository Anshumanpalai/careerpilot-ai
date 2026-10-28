package com.careerpilot.dto;

public record ApplicationStatsResponse(
        long totalApplied,
        long interviewsScheduled,
        long offersReceived,
        int averageMatchScore,
        int weeklyGoalTarget,
        long weeklyGoalCompleted
) {
}
