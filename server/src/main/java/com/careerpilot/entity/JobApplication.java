package com.careerpilot.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "job_applications",
    indexes = {
        @Index(name = "idx_job_applications_user_id", columnList = "user_id"),
        @Index(name = "idx_job_applications_user_status", columnList = "user_id, status"),
        @Index(name = "idx_job_applications_user_applied_date", columnList = "user_id, applied_date")
    }
)
public class JobApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Size(max = 150)
    @Column(name = "company_name", nullable = false, length = 150)
    private String companyName;

    @NotBlank
    @Size(max = 150)
    @Column(name = "job_title", nullable = false, length = 150)
    private String jobTitle;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ApplicationStatus status = ApplicationStatus.APPLIED;

    @Size(max = 150)
    @Column(name = "location", length = 150)
    private String location;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false, length = 50)
    private EmploymentType employmentType = EmploymentType.REMOTE;

    @Size(max = 500)
    @Column(name = "job_url", length = 500)
    private String jobUrl;

    @Size(max = 100)
    @Column(name = "salary_range", length = 100)
    private String salaryRange;

    @NotNull
    @Column(name = "applied_date", nullable = false)
    private LocalDate appliedDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "match_score")
    private Integer matchScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public JobApplication() {
    }

    public JobApplication(
            User user,
            String companyName,
            String jobTitle,
            ApplicationStatus status,
            String location,
            EmploymentType employmentType,
            String jobUrl,
            String salaryRange,
            LocalDate appliedDate,
            String notes,
            Integer matchScore
    ) {
        this.user = user;
        this.companyName = companyName;
        this.jobTitle = jobTitle;
        this.status = status != null ? status : ApplicationStatus.APPLIED;
        this.location = location;
        this.employmentType = employmentType != null ? employmentType : EmploymentType.REMOTE;
        this.jobUrl = jobUrl;
        this.salaryRange = salaryRange;
        this.appliedDate = appliedDate != null ? appliedDate : LocalDate.now();
        this.notes = notes;
        this.matchScore = matchScore;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = ApplicationStatus.APPLIED;
        }
        if (this.employmentType == null) {
            this.employmentType = EmploymentType.REMOTE;
        }
        if (this.appliedDate == null) {
            this.appliedDate = LocalDate.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public EmploymentType getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(EmploymentType employmentType) {
        this.employmentType = employmentType;
    }

    public String getJobUrl() {
        return jobUrl;
    }

    public void setJobUrl(String jobUrl) {
        this.jobUrl = jobUrl;
    }

    public String getSalaryRange() {
        return salaryRange;
    }

    public void setSalaryRange(String salaryRange) {
        this.salaryRange = salaryRange;
    }

    public LocalDate getAppliedDate() {
        return appliedDate;
    }

    public void setAppliedDate(LocalDate appliedDate) {
        this.appliedDate = appliedDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Integer getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(Integer matchScore) {
        this.matchScore = matchScore;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof JobApplication that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
