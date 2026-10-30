package com.careerpilot.service;

import com.careerpilot.dto.*;
import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeImprovement;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.exception.BadRequestException;
import com.careerpilot.exception.ResourceNotFoundException;
import com.careerpilot.repository.ResumeImprovementRepository;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.service.ai.AiProvider;
import com.careerpilot.service.ai.AiRateLimiter;
import com.careerpilot.service.ai.AiRawResult;
import com.careerpilot.exception.AiServiceException;
import com.careerpilot.exception.RateLimitExceededException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class ResumeImprovementService {

    private static final Logger log = LoggerFactory.getLogger(ResumeImprovementService.class);

    private static final String COMPLIANCE_NOTICE =
            "Disclaimer: All AI suggestions preserve the candidate's verified background. Suggestions do not guarantee interview invitations or employment outcomes. Unsupported suggested metrics require your personal verification before inclusion. The original uploaded resume remains immutable.";

    private static final int MAX_RESUME_TEXT_CHARS = 25000;

    private final ResumeRepository resumeRepository;
    private final ResumeImprovementRepository improvementRepository;
    private final AiProvider aiProvider;
    private final AiRateLimiter aiRateLimiter;
    private final ObjectMapper objectMapper;

    public ResumeImprovementService(
            ResumeRepository resumeRepository,
            ResumeImprovementRepository improvementRepository,
            AiProvider aiProvider,
            AiRateLimiter aiRateLimiter,
            ObjectMapper objectMapper
    ) {
        this.resumeRepository = resumeRepository;
        this.improvementRepository = improvementRepository;
        this.aiProvider = aiProvider;
        this.aiRateLimiter = aiRateLimiter;
        this.objectMapper = objectMapper;
    }

    public ResumeImprovementResponse improveResume(UUID userId, UUID resumeId, ResumeImprovementRequest request) {
        // 1. Mandatory consent enforcement
        if (request.userConsent() == null || !request.userConsent()) {
            throw new BadRequestException("Explicit user consent is required to transmit resume text and job description to an external AI service.");
        }

        // 2. Resume lookup and ownership validation
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found with id: " + resumeId));

        if (!resume.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to access or improve this resume.");
        }

        // 3. Status and text check
        if (resume.getStatus() != ResumeStatus.PARSED || resume.getRawText() == null || resume.getRawText().isBlank()) {
            throw new BadRequestException("Resume must be parsed before generating AI improvements. Please parse the resume first.");
        }

        // 4. Concurrency-safe rate limit check
        if (!aiRateLimiter.tryAcquire(userId)) {
            throw new RateLimitExceededException(
                    String.format("Rate limit reached. You can make at most %d resume improvement requests per minute. Please wait a moment and try again.",
                            aiRateLimiter.getMaxRequestsPerMinute())
            );
        }

        // 5. Sanitize and bound input text
        String safeResumeText = resume.getRawText();
        if (safeResumeText.length() > MAX_RESUME_TEXT_CHARS) {
            safeResumeText = safeResumeText.substring(0, MAX_RESUME_TEXT_CHARS);
        }

        String safeJobDescription = request.jobDescription().trim();
        String targetRole = request.targetRole() != null ? request.targetRole().trim() : null;

        // 6. Invoke AI Provider with safe execution timing
        long aiStartTime = System.currentTimeMillis();
        AiRawResult rawResult = aiProvider.generateImprovement(safeResumeText, safeJobDescription, targetRole);
        long aiDurationMs = System.currentTimeMillis() - aiStartTime;
        log.info("AI provider '{}' (model='{}') completed recommendations in {}ms for resume {}",
                rawResult.provider(), rawResult.model(), aiDurationMs, resumeId);

        // 7. Parse and validate structured output
        ParsedAiOutput parsedOutput = parseAndValidateOutput(rawResult.content());

        // 8. Serialize and persist improvement
        String bulletJson = writeJson(parsedOutput.bulletPointSuggestions);
        String skillsJson = writeJson(parsedOutput.evidencedSkills);
        String gapsJson = writeJson(parsedOutput.learningGaps);
        String recsJson = writeJson(parsedOutput.prioritizedRecommendations);
        String roadmapJson = writeJson(parsedOutput.learningRoadmap);

        ResumeImprovement improvement = new ResumeImprovement(
                resume,
                resume.getUser(),
                targetRole,
                rawResult.provider(),
                rawResult.model(),
                parsedOutput.improvedSummary.suggested(),
                parsedOutput.improvedSummary.rationale(),
                bulletJson,
                skillsJson,
                gapsJson,
                recsJson,
                roadmapJson
        );

        ResumeImprovement saved = improvementRepository.save(improvement);
        log.info("Saved resume improvement report id {} for resume {} and user {}", saved.getId(), resumeId, userId);

        return toResponse(saved, parsedOutput);
    }

    @Transactional(readOnly = true)
    public ResumeImprovementResponse getLatestImprovement(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found with id: " + resumeId));

        if (!resume.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to view improvements for this resume.");
        }

        ResumeImprovement latest = improvementRepository.findFirstByResumeIdAndUserIdOrderByCreatedAtDesc(resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("No AI improvement recommendations found for this resume."));

        return toResponse(latest);
    }

    private ParsedAiOutput parseAndValidateOutput(String rawJsonContent) {
        if (rawJsonContent == null || rawJsonContent.isBlank()) {
            throw new AiServiceException("AI provider returned empty content.");
        }

        String cleaned = cleanJsonString(rawJsonContent);

        try {
            JsonNode rootNode = objectMapper.readTree(cleaned);

            // Summary
            JsonNode summaryNode = rootNode.path("improvedSummary");
            SummaryImprovementDto summary = new SummaryImprovementDto(
                    summaryNode.path("original").asText("Current Profile Summary"),
                    summaryNode.path("suggested").asText("Tailored Professional Summary"),
                    summaryNode.path("rationale").asText("Optimized for job role relevance while maintaining strict factual integrity.")
            );

            // Bullet Point Suggestions
            List<BulletSuggestionDto> bullets = new ArrayList<>();
            JsonNode bulletsNode = rootNode.path("bulletPointSuggestions");
            if (bulletsNode.isArray()) {
                for (JsonNode b : bulletsNode) {
                    boolean requiresEvidence = b.path("requiresUserEvidence").asBoolean(false);
                    String evidencePrompt = b.path("evidencePrompt").asText("");
                    bullets.add(new BulletSuggestionDto(
                            b.path("original").asText("Original accomplishment"),
                            b.path("suggested").asText("Enhanced accomplishment statement"),
                            b.path("rationale").asText("Better action verbs and business context"),
                            requiresEvidence,
                            evidencePrompt
                    ));
                }
            }

            // Evidenced Skills
            List<EvidencedSkillDto> evidencedSkills = new ArrayList<>();
            JsonNode skillsNode = rootNode.path("evidencedSkills");
            if (skillsNode.isArray()) {
                for (JsonNode s : skillsNode) {
                    evidencedSkills.add(new EvidencedSkillDto(
                            s.path("skill").asText("Skill"),
                            s.path("category").asText("Technical"),
                            s.path("evidenceSnippet").asText("")
                    ));
                }
            }

            // Learning Gaps
            List<LearningGapDto> learningGaps = new ArrayList<>();
            JsonNode gapsNode = rootNode.path("learningGaps");
            if (gapsNode.isArray()) {
                for (JsonNode g : gapsNode) {
                    learningGaps.add(new LearningGapDto(
                            g.path("missingRequirement").asText("Requirement"),
                            g.path("importance").asText("REQUIRED"),
                            g.path("reason").asText("Job requires this competency which is not currently evidenced.")
                    ));
                }
            }

            // Prioritized Recommendations
            List<RecommendationDto> recommendations = new ArrayList<>();
            JsonNode recsNode = rootNode.path("prioritizedRecommendations");
            if (recsNode.isArray()) {
                for (JsonNode r : recsNode) {
                    recommendations.add(new RecommendationDto(
                            r.path("priority").asText("MEDIUM"),
                            r.path("title").asText("Recommendation"),
                            r.path("actionableAdvice").asText("")
                    ));
                }
            }

            // Learning Roadmap
            List<RoadmapItemDto> roadmap = new ArrayList<>();
            JsonNode roadmapNode = rootNode.path("learningRoadmap");
            if (roadmapNode.isArray()) {
                for (JsonNode rm : roadmapNode) {
                    List<String> actionSteps = new ArrayList<>();
                    if (rm.path("actionSteps").isArray()) {
                        for (JsonNode step : rm.path("actionSteps")) {
                            actionSteps.add(step.asText());
                        }
                    }
                    List<String> recommendedTopics = new ArrayList<>();
                    if (rm.path("recommendedTopics").isArray()) {
                        for (JsonNode topic : rm.path("recommendedTopics")) {
                            recommendedTopics.add(topic.asText());
                        }
                    }
                    roadmap.add(new RoadmapItemDto(
                            rm.path("skill").asText("Skill Gap"),
                            actionSteps,
                            rm.path("estimatedTimeToAcquire").asText("2-4 weeks"),
                            recommendedTopics
                    ));
                }
            }

            return new ParsedAiOutput(summary, bullets, evidencedSkills, learningGaps, recommendations, roadmap);

        } catch (Exception ex) {
            log.error("Failed to parse AI provider JSON output: {}", ex.getMessage());
            throw new AiServiceException("Failed to parse structured recommendations from AI provider response: " + ex.getMessage(), ex);
        }
    }

    private String cleanJsonString(String raw) {
        String trimmed = raw.trim();
        // Remove markdown backticks if present
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private String writeJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Failed to serialize field to JSON: {}", e.getMessage());
            return "[]";
        }
    }

    private <T> List<T> readJsonList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception e) {
            log.error("Failed to deserialize JSON field: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private ResumeImprovementResponse toResponse(ResumeImprovement entity, ParsedAiOutput parsedOutput) {
        return new ResumeImprovementResponse(
                entity.getId(),
                entity.getResume().getId(),
                entity.getTargetRole(),
                entity.getProviderName(),
                entity.getModelName(),
                parsedOutput.improvedSummary,
                parsedOutput.bulletPointSuggestions,
                parsedOutput.evidencedSkills,
                parsedOutput.learningGaps,
                parsedOutput.prioritizedRecommendations,
                parsedOutput.learningRoadmap,
                COMPLIANCE_NOTICE,
                entity.getCreatedAt()
        );
    }

    private ResumeImprovementResponse toResponse(ResumeImprovement entity) {
        SummaryImprovementDto summary = new SummaryImprovementDto(
                "Original Resume Profile",
                entity.getImprovedSummary(),
                entity.getSummaryRationale()
        );

        List<BulletSuggestionDto> bullets = readJsonList(entity.getBulletSuggestionsJson(), new TypeReference<>() {});
        List<EvidencedSkillDto> evidencedSkills = readJsonList(entity.getEvidencedSkillsJson(), new TypeReference<>() {});
        List<LearningGapDto> learningGaps = readJsonList(entity.getLearningGapsJson(), new TypeReference<>() {});
        List<RecommendationDto> recommendations = readJsonList(entity.getRecommendationsJson(), new TypeReference<>() {});
        List<RoadmapItemDto> roadmap = readJsonList(entity.getLearningRoadmapJson(), new TypeReference<>() {});

        return new ResumeImprovementResponse(
                entity.getId(),
                entity.getResume().getId(),
                entity.getTargetRole(),
                entity.getProviderName(),
                entity.getModelName(),
                summary,
                bullets,
                evidencedSkills,
                learningGaps,
                recommendations,
                roadmap,
                COMPLIANCE_NOTICE,
                entity.getCreatedAt()
        );
    }

    private record ParsedAiOutput(
            SummaryImprovementDto improvedSummary,
            List<BulletSuggestionDto> bulletPointSuggestions,
            List<EvidencedSkillDto> evidencedSkills,
            List<LearningGapDto> learningGaps,
            List<RecommendationDto> prioritizedRecommendations,
            List<RoadmapItemDto> learningRoadmap
    ) {}
}
