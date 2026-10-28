package com.careerpilot.dto;

import com.careerpilot.entity.ApplicationStatus;
import com.careerpilot.entity.EmploymentType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateApplicationRequest(
        @NotBlank(message = "Company name is required")
        @Size(max = 150, message = "Company name cannot exceed 150 characters")
        String companyName,

        @NotBlank(message = "Job title is required")
        @Size(max = 150, message = "Job title cannot exceed 150 characters")
        String jobTitle,

        ApplicationStatus status,

        @Size(max = 150, message = "Location cannot exceed 150 characters")
        String location,

        EmploymentType employmentType,

        @Size(max = 500, message = "Job URL cannot exceed 500 characters")
        String jobUrl,

        @Size(max = 100, message = "Salary range cannot exceed 100 characters")
        String salaryRange,

        LocalDate appliedDate,

        String notes,

        @Min(value = 0, message = "Match score must be at least 0")
        @Max(value = 100, message = "Match score cannot exceed 100")
        Integer matchScore
) {
    public UpdateApplicationRequest {
        if (companyName != null) {
            companyName = companyName.trim();
        }
        if (jobTitle != null) {
            jobTitle = jobTitle.trim();
        }
        if (location != null) {
            location = location.trim();
        }
        if (salaryRange != null) {
            salaryRange = salaryRange.trim();
        }
        if (jobUrl != null) {
            jobUrl = jobUrl.trim();
        }
        if (notes != null) {
            notes = notes.trim();
        }
        if (status == null) {
            status = ApplicationStatus.APPLIED;
        }
        if (employmentType == null) {
            employmentType = EmploymentType.REMOTE;
        }
        if (appliedDate == null) {
            appliedDate = LocalDate.now();
        }
    }
}
