package com.careerpilot.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "resume_versions",
    indexes = {
        @Index(name = "idx_resume_versions_resume_id", columnList = "resume_id"),
        @Index(name = "idx_resume_versions_user_id", columnList = "user_id"),
        @Index(name = "idx_resume_versions_created_at", columnList = "created_at"),
        @Index(name = "idx_resume_versions_version_number", columnList = "resume_id, version_number")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_resume_versions_resume_num", columnNames = {"resume_id", "version_number"})
    }
)
public class ResumeVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @NotBlank
    @Size(max = 150)
    @Column(name = "version_name", nullable = false, length = 150)
    private String versionName;

    @Size(max = 150)
    @Column(name = "target_role", length = 150)
    private String targetRole;

    @Size(max = 150)
    @Column(name = "target_company", length = 150)
    private String targetCompany;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "skills", columnDefinition = "TEXT")
    private String skills;

    @Column(name = "experience", columnDefinition = "TEXT")
    private String experience;

    @Column(name = "education", columnDefinition = "TEXT")
    private String education;

    @Column(name = "projects", columnDefinition = "TEXT")
    private String projects;

    @Column(name = "custom_sections", columnDefinition = "TEXT")
    private String customSections;

    @NotNull
    @Column(name = "is_base_version", nullable = false)
    private Boolean isBaseVersion = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_version_id")
    private ResumeVersion parentVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ResumeVersion() {
    }

    public ResumeVersion(
            Resume resume,
            User user,
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
            Boolean isBaseVersion,
            ResumeVersion parentVersion
    ) {
        this.resume = resume;
        this.user = user;
        this.versionNumber = versionNumber;
        this.versionName = versionName;
        this.targetRole = targetRole;
        this.targetCompany = targetCompany;
        this.summary = summary;
        this.skills = skills;
        this.experience = experience;
        this.education = education;
        this.projects = projects;
        this.customSections = customSections;
        this.isBaseVersion = isBaseVersion != null ? isBaseVersion : false;
        this.parentVersion = parentVersion;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.isBaseVersion == null) {
            this.isBaseVersion = false;
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

    public Resume getResume() {
        return resume;
    }

    public void setResume(Resume resume) {
        this.resume = resume;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Integer getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getVersionName() {
        return versionName;
    }

    public void setVersionName(String versionName) {
        this.versionName = versionName;
    }

    public String getTargetRole() {
        return targetRole;
    }

    public void setTargetRole(String targetRole) {
        this.targetRole = targetRole;
    }

    public String getTargetCompany() {
        return targetCompany;
    }

    public void setTargetCompany(String targetCompany) {
        this.targetCompany = targetCompany;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getExperience() {
        return experience;
    }

    public void setExperience(String experience) {
        this.experience = experience;
    }

    public String getEducation() {
        return education;
    }

    public void setEducation(String education) {
        this.education = education;
    }

    public String getProjects() {
        return projects;
    }

    public void setProjects(String projects) {
        this.projects = projects;
    }

    public String getCustomSections() {
        return customSections;
    }

    public void setCustomSections(String customSections) {
        this.customSections = customSections;
    }

    public Boolean getIsBaseVersion() {
        return isBaseVersion;
    }

    public void setIsBaseVersion(Boolean isBaseVersion) {
        this.isBaseVersion = isBaseVersion;
    }

    public ResumeVersion getParentVersion() {
        return parentVersion;
    }

    public void setParentVersion(ResumeVersion parentVersion) {
        this.parentVersion = parentVersion;
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
        if (!(o instanceof ResumeVersion that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

