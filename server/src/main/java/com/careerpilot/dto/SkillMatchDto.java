package com.careerpilot.dto;

public record SkillMatchDto(
        String skillName,
        String category,
        String requirementType, // "REQUIRED" or "PREFERRED"
        boolean matched,
        String snippet // Verbatim snippet from resume where detected, or null if not detected
) {
}
