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
    name = "resume_improvements",
    indexes = {
        @Index(name = "idx_resume_improvements_resume_id", columnList = "resume_id"),
        @Index(name = "idx_resume_improvements_user_id", columnList = "user_id"),
        @Index(name = "idx_resume_improvements_created_at", columnList = "created_at")
    }
)
public class ResumeImprovement {

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

    @Size(max = 150)
    @Column(name = "target_role", length = 150)
    private String targetRole;

    @NotBlank
    @Size(max = 50)
    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @NotBlank
    @Size(max = 100)
    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "improved_summary", columnDefinition = "TEXT")
    private String improvedSummary;

    @Column(name = "summary_rationale", columnDefinition = "TEXT")
    private String summaryRationale;

    @Column(name = "bullet_suggestions_json", columnDefinition = "TEXT")
    private String bulletSuggestionsJson;

    @Column(name = "evidenced_skills_json", columnDefinition = "TEXT")
    private String evidencedSkillsJson;

    @Column(name = "learning_gaps_json", columnDefinition = "TEXT")
    private String learningGapsJson;

    @Column(name = "recommendations_json", columnDefinition = "TEXT")
    private String recommendationsJson;

    @Column(name = "learning_roadmap_json", columnDefinition = "TEXT")
    private String learningRoadmapJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ResumeImprovement() {
    }

    public ResumeImprovement(
            Resume resume,
            User user,
            String targetRole,
            String providerName,
            String modelName,
            String improvedSummary,
            String summaryRationale,
            String bulletSuggestionsJson,
            String evidencedSkillsJson,
            String learningGapsJson,
            String recommendationsJson,
            String learningRoadmapJson
    ) {
        this.resume = resume;
        this.user = user;
        this.targetRole = targetRole;
        this.providerName = providerName;
        this.modelName = modelName;
        this.improvedSummary = improvedSummary;
        this.summaryRationale = summaryRationale;
        this.bulletSuggestionsJson = bulletSuggestionsJson;
        this.evidencedSkillsJson = evidencedSkillsJson;
        this.learningGapsJson = learningGapsJson;
        this.recommendationsJson = recommendationsJson;
        this.learningRoadmapJson = learningRoadmapJson;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
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

    public String getTargetRole() {
        return targetRole;
    }

    public void setTargetRole(String targetRole) {
        this.targetRole = targetRole;
    }

    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getImprovedSummary() {
        return improvedSummary;
    }

    public void setImprovedSummary(String improvedSummary) {
        this.improvedSummary = improvedSummary;
    }

    public String getSummaryRationale() {
        return summaryRationale;
    }

    public void setSummaryRationale(String summaryRationale) {
        this.summaryRationale = summaryRationale;
    }

    public String getBulletSuggestionsJson() {
        return bulletSuggestionsJson;
    }

    public void setBulletSuggestionsJson(String bulletSuggestionsJson) {
        this.bulletSuggestionsJson = bulletSuggestionsJson;
    }

    public String getEvidencedSkillsJson() {
        return evidencedSkillsJson;
    }

    public void setEvidencedSkillsJson(String evidencedSkillsJson) {
        this.evidencedSkillsJson = evidencedSkillsJson;
    }

    public String getLearningGapsJson() {
        return learningGapsJson;
    }

    public void setLearningGapsJson(String learningGapsJson) {
        this.learningGapsJson = learningGapsJson;
    }

    public String getRecommendationsJson() {
        return recommendationsJson;
    }

    public void setRecommendationsJson(String recommendationsJson) {
        this.recommendationsJson = recommendationsJson;
    }

    public String getLearningRoadmapJson() {
        return learningRoadmapJson;
    }

    public void setLearningRoadmapJson(String learningRoadmapJson) {
        this.learningRoadmapJson = learningRoadmapJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ResumeImprovement that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
