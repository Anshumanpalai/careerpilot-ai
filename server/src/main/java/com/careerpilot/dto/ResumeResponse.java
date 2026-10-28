package com.careerpilot.dto;

import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;

import java.time.Instant;
import java.util.UUID;

public record ResumeResponse(
        UUID id,
        String originalFilename,
        String contentType,
        Long fileSize,
        ResumeStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static ResumeResponse fromEntity(Resume resume) {
        return new ResumeResponse(
                resume.getId(),
                resume.getOriginalFilename(),
                resume.getContentType(),
                resume.getFileSize(),
                resume.getStatus(),
                resume.getCreatedAt(),
                resume.getUpdatedAt()
        );
    }
}
