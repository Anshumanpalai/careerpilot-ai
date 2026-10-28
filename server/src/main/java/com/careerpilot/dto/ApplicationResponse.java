package com.careerpilot.dto;

import com.careerpilot.entity.ApplicationStatus;
import com.careerpilot.entity.EmploymentType;
import com.careerpilot.entity.JobApplication;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ApplicationResponse(
        UUID id,
        String companyName,
        String jobTitle,
        ApplicationStatus status,
        String location,
        EmploymentType employmentType,
        String jobUrl,
        String salaryRange,
        LocalDate appliedDate,
        String notes,
        Integer matchScore,
        Instant createdAt,
        Instant updatedAt
) {
    public static ApplicationResponse fromEntity(JobApplication app) {
        return new ApplicationResponse(
                app.getId(),
                app.getCompanyName(),
                app.getJobTitle(),
                app.getStatus(),
                app.getLocation(),
                app.getEmploymentType(),
                app.getJobUrl(),
                app.getSalaryRange(),
                app.getAppliedDate(),
                app.getNotes(),
                app.getMatchScore(),
                app.getCreatedAt(),
                app.getUpdatedAt()
        );
    }
}
