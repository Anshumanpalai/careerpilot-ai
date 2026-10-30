package com.careerpilot.dto;

import com.careerpilot.entity.ResumeVersion;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.UUID;

public record ResumeVersionResponse(
        UUID id,
        UUID resumeId,
        Integer versionNumber,
        String versionName,
        String targetRole,
        String targetCompany,
        String summary,
        String skills,
        String experience,
        String education,
        String projects,
        String customSections,
        @JsonProperty("isBaseVersion") Boolean isBaseVersion,
        UUID parentVersionId,
        Integer parentVersionNumber,
        String parentVersionName,
        int wordCount,
        int characterCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static ResumeVersionResponse fromEntity(ResumeVersion entity) {
        if (entity == null) {
            return null;
        }

        UUID parentId = entity.getParentVersion() != null ? entity.getParentVersion().getId() : null;
        Integer parentNum = entity.getParentVersion() != null ? entity.getParentVersion().getVersionNumber() : null;
        String parentName = entity.getParentVersion() != null ? entity.getParentVersion().getVersionName() : null;

        int totalChars = countCharacters(
                entity.getSummary(),
                entity.getSkills(),
                entity.getExperience(),
                entity.getEducation(),
                entity.getProjects(),
                entity.getCustomSections()
        );

        int totalWords = countWords(
                entity.getSummary(),
                entity.getSkills(),
                entity.getExperience(),
                entity.getEducation(),
                entity.getProjects(),
                entity.getCustomSections()
        );

        return new ResumeVersionResponse(
                entity.getId(),
                entity.getResume().getId(),
                entity.getVersionNumber(),
                entity.getVersionName(),
                entity.getTargetRole(),
                entity.getTargetCompany(),
                entity.getSummary(),
                entity.getSkills(),
                entity.getExperience(),
                entity.getEducation(),
                entity.getProjects(),
                entity.getCustomSections(),
                entity.getIsBaseVersion(),
                parentId,
                parentNum,
                parentName,
                totalWords,
                totalChars,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private static int countCharacters(String... sections) {
        int count = 0;
        for (String section : sections) {
            if (section != null) {
                count += section.length();
            }
        }
        return count;
    }

    private static int countWords(String... sections) {
        int count = 0;
        for (String section : sections) {
            if (section != null && !section.isBlank()) {
                String[] words = section.trim().split("\\s+");
                count += words.length;
            }
        }
        return count;
    }
}
