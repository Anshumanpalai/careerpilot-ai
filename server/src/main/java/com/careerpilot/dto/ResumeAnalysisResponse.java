package com.careerpilot.dto;

import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;

import java.time.Instant;
import java.util.UUID;

public record ResumeAnalysisResponse(
        UUID id,
        String originalFilename,
        ResumeStatus status,
        String rawText,
        ResumeSectionsResponse sections,
        String parsingError,
        Instant parsedAt,
        Instant createdAt
) {
    public static ResumeAnalysisResponse fromEntity(Resume resume) {
        ResumeSectionsResponse sections = new ResumeSectionsResponse(
                resume.getSkillsSummary(),
                resume.getExperienceSummary(),
                resume.getEducationSummary(),
                resume.getProjectsSummary()
        );

        return new ResumeAnalysisResponse(
                resume.getId(),
                resume.getOriginalFilename(),
                resume.getStatus(),
                resume.getRawText(),
                sections,
                resume.getParsingError(),
                resume.getParsedAt(),
                resume.getCreatedAt()
        );
    }
}
