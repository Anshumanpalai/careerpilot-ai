package com.careerpilot.service;

import com.careerpilot.dto.*;
import com.careerpilot.entity.ApplicationStatus;
import com.careerpilot.entity.JobApplication;
import com.careerpilot.entity.User;
import com.careerpilot.exception.ResourceNotFoundException;
import com.careerpilot.repository.JobApplicationRepository;
import com.careerpilot.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class JobApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public JobApplicationService(JobApplicationRepository applicationRepository, UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> listApplications(
            UUID userId,
            ApplicationStatus status,
            String query,
            String sortBy,
            String sortOrder
    ) {
        Sort sort = buildSort(sortBy, sortOrder);
        String cleanedQuery = (query != null && !query.trim().isEmpty()) ? query.trim() : null;

        List<JobApplication> applications = applicationRepository.searchApplications(
                userId,
                status,
                cleanedQuery,
                sort
        );

        return applications.stream()
                .map(ApplicationResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplication(UUID userId, UUID id) {
        JobApplication application = applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("JobApplication", "id", id));
        return ApplicationResponse.fromEntity(application);
    }

    public ApplicationResponse createApplication(UUID userId, CreateApplicationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        JobApplication application = new JobApplication(
                user,
                request.companyName(),
                request.jobTitle(),
                request.status(),
                request.location(),
                request.employmentType(),
                request.jobUrl(),
                request.salaryRange(),
                request.appliedDate(),
                request.notes(),
                request.matchScore()
        );

        JobApplication saved = applicationRepository.save(application);
        return ApplicationResponse.fromEntity(saved);
    }

    public ApplicationResponse updateApplication(UUID userId, UUID id, UpdateApplicationRequest request) {
        JobApplication application = applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("JobApplication", "id", id));

        application.setCompanyName(request.companyName());
        application.setJobTitle(request.jobTitle());
        if (request.status() != null) {
            application.setStatus(request.status());
        }
        application.setLocation(request.location());
        if (request.employmentType() != null) {
            application.setEmploymentType(request.employmentType());
        }
        application.setJobUrl(request.jobUrl());
        application.setSalaryRange(request.salaryRange());
        if (request.appliedDate() != null) {
            application.setAppliedDate(request.appliedDate());
        }
        application.setNotes(request.notes());
        application.setMatchScore(request.matchScore());

        JobApplication updated = applicationRepository.save(application);
        return ApplicationResponse.fromEntity(updated);
    }

    public ApplicationResponse updateStatus(UUID userId, UUID id, ApplicationStatus newStatus) {
        JobApplication application = applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("JobApplication", "id", id));

        application.setStatus(newStatus);
        JobApplication updated = applicationRepository.save(application);
        return ApplicationResponse.fromEntity(updated);
    }

    public void deleteApplication(UUID userId, UUID id) {
        JobApplication application = applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("JobApplication", "id", id));

        applicationRepository.delete(application);
    }

    @Transactional(readOnly = true)
    public ApplicationStatsResponse getStats(UUID userId) {
        long totalApplied = applicationRepository.countByUserId(userId);
        long interviewsScheduled = applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.INTERVIEWING);
        long offersReceived = applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.OFFER);

        Double avgScore = applicationRepository.getAverageMatchScoreByUserId(userId);
        int averageMatchScore = avgScore != null ? (int) Math.round(avgScore) : 0;

        int weeklyGoalTarget = 5;
        LocalDate oneWeekAgo = LocalDate.now().minusDays(7);
        long weeklyGoalCompleted = applicationRepository.countByUserIdAndAppliedDateGreaterThanEqual(userId, oneWeekAgo);

        return new ApplicationStatsResponse(
                totalApplied,
                interviewsScheduled,
                offersReceived,
                averageMatchScore,
                weeklyGoalTarget,
                weeklyGoalCompleted
        );
    }

    private Sort buildSort(String sortBy, String sortOrder) {
        String property = switch (sortBy != null ? sortBy : "appliedDate") {
            case "companyName" -> "companyName";
            case "matchScore" -> "matchScore";
            case "createdAt" -> "createdAt";
            default -> "appliedDate";
        };

        Sort.Direction direction = "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, property);
    }
}
