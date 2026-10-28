package com.careerpilot.dto;

public record BulletSuggestionDto(
        String original,
        String suggested,
        String rationale,
        boolean requiresUserEvidence,
        String evidencePrompt
) {
}
