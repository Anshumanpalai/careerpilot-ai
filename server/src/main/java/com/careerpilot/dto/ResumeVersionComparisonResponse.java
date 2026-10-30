package com.careerpilot.dto;

import java.util.List;

public record ResumeVersionComparisonResponse(
        ResumeVersionResponse sourceVersion,
        ResumeVersionResponse targetVersion,
        SectionDiff summaryDiff,
        SectionDiff skillsDiff,
        SectionDiff experienceDiff,
        SectionDiff educationDiff,
        SectionDiff projectsDiff,
        int wordCountDelta,
        int characterCountDelta,
        List<String> addedSkills,
        List<String> removedSkills
) {
    public record SectionDiff(
            String sectionName,
            boolean modified,
            String sourceText,
            String targetText,
            int sourceWordCount,
            int targetWordCount,
            int wordDelta
    ) {}
}

