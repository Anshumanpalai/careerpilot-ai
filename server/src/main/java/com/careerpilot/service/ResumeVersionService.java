package com.careerpilot.service;

import com.careerpilot.dto.*;
import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.ResumeVersion;
import com.careerpilot.entity.User;
import com.careerpilot.exception.BadRequestException;
import com.careerpilot.exception.ResourceNotFoundException;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.repository.ResumeVersionRepository;
import com.careerpilot.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ResumeVersionService {

    private final ResumeVersionRepository resumeVersionRepository;
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final ResumePdfExportService pdfExportService;

    public ResumeVersionService(
            ResumeVersionRepository resumeVersionRepository,
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            ResumePdfExportService pdfExportService
    ) {
        this.resumeVersionRepository = resumeVersionRepository;
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.pdfExportService = pdfExportService;
    }

    public List<ResumeVersionResponse> listVersions(UUID userId, UUID resumeId) {
        Resume resume = getResumeAndVerifyOwnership(userId, resumeId);

        List<ResumeVersion> versions = resumeVersionRepository.findByResumeIdAndUserIdOrderByVersionNumberDesc(resumeId, userId);

        // Auto-seed baseline version if no versions exist yet
        if (versions.isEmpty()) {
            ResumeVersion baseVersion = autoSeedBaseVersion(resume);
            if (baseVersion != null) {
                versions = List.of(baseVersion);
            }
        }

        return versions.stream()
                .map(ResumeVersionResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeVersionResponse getVersion(UUID userId, UUID resumeId, UUID versionId) {
        ResumeVersion version = getVersionAndVerifyOwnership(userId, resumeId, versionId);
        return ResumeVersionResponse.fromEntity(version);
    }

    public ResumeVersionResponse createVersion(UUID userId, UUID resumeId, CreateResumeVersionRequest request) {
        Resume resume = getResumeAndVerifyOwnership(userId, resumeId);
        User user = resume.getUser();

        int nextVersionNumber = resumeVersionRepository.findMaxVersionNumberByResumeIdAndUserId(resumeId, userId) + 1;
        String name = (request.versionName() != null && !request.versionName().isBlank())
                ? request.versionName().trim()
                : "v" + nextVersionNumber + " - Draft";

        ResumeVersion version = new ResumeVersion(
                resume,
                user,
                nextVersionNumber,
                name,
                request.targetRole(),
                request.targetCompany(),
                request.summary(),
                request.skills(),
                request.experience(),
                request.education(),
                request.projects(),
                request.customSections(),
                request.isBaseVersion() != null ? request.isBaseVersion() : false,
                null
        );

        ResumeVersion saved = resumeVersionRepository.save(version);
        return ResumeVersionResponse.fromEntity(saved);
    }

    public ResumeVersionResponse updateVersion(UUID userId, UUID resumeId, UUID versionId, UpdateResumeVersionRequest request) {
        ResumeVersion version = getVersionAndVerifyOwnership(userId, resumeId, versionId);

        version.setVersionName(request.versionName().trim());
        version.setTargetRole(request.targetRole());
        version.setTargetCompany(request.targetCompany());
        version.setSummary(request.summary());
        version.setSkills(request.skills());
        version.setExperience(request.experience());
        version.setEducation(request.education());
        version.setProjects(request.projects());
        version.setCustomSections(request.customSections());

        ResumeVersion saved = resumeVersionRepository.save(version);
        return ResumeVersionResponse.fromEntity(saved);
    }

    public ResumeVersionResponse duplicateVersion(UUID userId, UUID resumeId, UUID versionId, DuplicateResumeVersionRequest request) {
        ResumeVersion source = getVersionAndVerifyOwnership(userId, resumeId, versionId);
        User user = source.getUser();
        Resume resume = source.getResume();

        int nextVersionNumber = resumeVersionRepository.findMaxVersionNumberByResumeIdAndUserId(resumeId, userId) + 1;
        String newName = (request != null && request.newVersionName() != null && !request.newVersionName().isBlank())
                ? request.newVersionName().trim()
                : "v" + nextVersionNumber + " - Copy of " + source.getVersionName();

        String targetRole = (request != null && request.targetRole() != null) ? request.targetRole() : source.getTargetRole();
        String targetCompany = (request != null && request.targetCompany() != null) ? request.targetCompany() : source.getTargetCompany();

        ResumeVersion copy = new ResumeVersion(
                resume,
                user,
                nextVersionNumber,
                newName,
                targetRole,
                targetCompany,
                source.getSummary(),
                source.getSkills(),
                source.getExperience(),
                source.getEducation(),
                source.getProjects(),
                source.getCustomSections(),
                false,
                source
        );

        ResumeVersion saved = resumeVersionRepository.save(copy);
        return ResumeVersionResponse.fromEntity(saved);
    }

    /**
     * Restores a historical version by creating a NEW version with identical content,
     * maintaining complete, immutable audit trail of past edits.
     */
    public ResumeVersionResponse restoreVersion(UUID userId, UUID resumeId, UUID versionId, RestoreResumeVersionRequest request) {
        ResumeVersion historical = getVersionAndVerifyOwnership(userId, resumeId, versionId);
        User user = historical.getUser();
        Resume resume = historical.getResume();

        int nextVersionNumber = resumeVersionRepository.findMaxVersionNumberByResumeIdAndUserId(resumeId, userId) + 1;
        String restoredName = (request != null && request.newVersionName() != null && !request.newVersionName().isBlank())
                ? request.newVersionName().trim()
                : "v" + nextVersionNumber + " - Restored from v" + historical.getVersionNumber() + " (" + historical.getVersionName() + ")";

        ResumeVersion restored = new ResumeVersion(
                resume,
                user,
                nextVersionNumber,
                restoredName,
                historical.getTargetRole(),
                historical.getTargetCompany(),
                historical.getSummary(),
                historical.getSkills(),
                historical.getExperience(),
                historical.getEducation(),
                historical.getProjects(),
                historical.getCustomSections(),
                false,
                historical
        );

        ResumeVersion saved = resumeVersionRepository.save(restored);
        return ResumeVersionResponse.fromEntity(saved);
    }

    public void deleteVersion(UUID userId, UUID resumeId, UUID versionId) {
        ResumeVersion version = getVersionAndVerifyOwnership(userId, resumeId, versionId);
        resumeVersionRepository.delete(version);
    }

    @Transactional(readOnly = true)
    public ResumeVersionComparisonResponse compareVersions(UUID userId, UUID resumeId, UUID sourceId, UUID targetId) {
        ResumeVersion source = getVersionAndVerifyOwnership(userId, resumeId, sourceId);
        ResumeVersion target = getVersionAndVerifyOwnership(userId, resumeId, targetId);

        ResumeVersionComparisonResponse.SectionDiff summaryDiff = buildSectionDiff("Professional Summary", source.getSummary(), target.getSummary());
        ResumeVersionComparisonResponse.SectionDiff skillsDiff = buildSectionDiff("Skills", source.getSkills(), target.getSkills());
        ResumeVersionComparisonResponse.SectionDiff experienceDiff = buildSectionDiff("Experience", source.getExperience(), target.getExperience());
        ResumeVersionComparisonResponse.SectionDiff educationDiff = buildSectionDiff("Education", source.getEducation(), target.getEducation());
        ResumeVersionComparisonResponse.SectionDiff projectsDiff = buildSectionDiff("Projects", source.getProjects(), target.getProjects());

        ResumeVersionResponse sourceResp = ResumeVersionResponse.fromEntity(source);
        ResumeVersionResponse targetResp = ResumeVersionResponse.fromEntity(target);

        int wordDelta = targetResp.wordCount() - sourceResp.wordCount();
        int charDelta = targetResp.characterCount() - sourceResp.characterCount();

        Set<String> sourceSkillSet = parseSkillsToSet(source.getSkills());
        Set<String> targetSkillSet = parseSkillsToSet(target.getSkills());

        List<String> addedSkills = targetSkillSet.stream()
                .filter(s -> !sourceSkillSet.contains(s))
                .sorted()
                .toList();

        List<String> removedSkills = sourceSkillSet.stream()
                .filter(s -> !targetSkillSet.contains(s))
                .sorted()
                .toList();

        return new ResumeVersionComparisonResponse(
                sourceResp,
                targetResp,
                summaryDiff,
                skillsDiff,
                experienceDiff,
                educationDiff,
                projectsDiff,
                wordDelta,
                charDelta,
                addedSkills,
                removedSkills
        );
    }

    public ResumeVersionResponse applyAiSuggestion(UUID userId, UUID resumeId, UUID versionId, ApplyAiSuggestionRequest request) {
        ResumeVersion version = getVersionAndVerifyOwnership(userId, resumeId, versionId);

        String type = request.suggestionType().toUpperCase();
        String targetSection = request.targetSection().toLowerCase();
        String textToApply = request.textToApply().trim();
        String action = request.action() != null ? request.action().toUpperCase() : "APPEND";

        switch (type) {
            case "SUMMARY":
                version.setSummary(textToApply);
                break;

            case "SKILL":
                String currentSkills = version.getSkills() != null ? version.getSkills() : "";
                if (!containsSkill(currentSkills, textToApply)) {
                    if (currentSkills.isBlank()) {
                        version.setSkills(textToApply);
                    } else if (currentSkills.contains(",")) {
                        version.setSkills(currentSkills.trim() + ", " + textToApply);
                    } else {
                        version.setSkills(currentSkills.trim() + "\n• " + textToApply);
                    }
                }
                break;

            case "BULLET":
                if ("experience".equals(targetSection)) {
                    version.setExperience(applyBulletToContent(version.getExperience(), textToApply, request.originalText(), action));
                } else if ("projects".equals(targetSection)) {
                    version.setProjects(applyBulletToContent(version.getProjects(), textToApply, request.originalText(), action));
                } else {
                    version.setExperience(applyBulletToContent(version.getExperience(), textToApply, request.originalText(), action));
                }
                break;

            default:
                throw new BadRequestException("Unsupported suggestion type: " + type);
        }

        ResumeVersion saved = resumeVersionRepository.save(version);
        return ResumeVersionResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public PdfExportResult exportVersionPdf(UUID userId, UUID resumeId, UUID versionId) {
        ResumeVersion version = getVersionAndVerifyOwnership(userId, resumeId, versionId);
        User user = version.getUser();

        byte[] pdfBytes = pdfExportService.generateResumePdf(version, user);

        String safeRole = version.getTargetRole() != null && !version.getTargetRole().isBlank()
                ? version.getTargetRole().replaceAll("[^a-zA-Z0-9_-]", "_")
                : "Resume";
        String safeVersion = version.getVersionName().replaceAll("[^a-zA-Z0-9_-]", "_");
        String filename = String.format("%s_%s_ATS.pdf", safeRole, safeVersion);

        return new PdfExportResult(pdfBytes, filename);
    }

    private Resume getResumeAndVerifyOwnership(UUID userId, UUID resumeId) {
        return resumeRepository.findByIdAndUserId(resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));
    }

    private ResumeVersion getVersionAndVerifyOwnership(UUID userId, UUID resumeId, UUID versionId) {
        return resumeVersionRepository.findByIdAndResumeIdAndUserId(versionId, resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("ResumeVersion", "id", versionId));
    }

    private ResumeVersion autoSeedBaseVersion(Resume resume) {
        int nextVersionNumber = 1;
        String baseSummary = extractSummarySeed(resume);

        ResumeVersion base = new ResumeVersion(
                resume,
                resume.getUser(),
                nextVersionNumber,
                "v1 - Baseline (Uploaded)",
                null,
                null,
                baseSummary,
                resume.getSkillsSummary(),
                resume.getExperienceSummary(),
                resume.getEducationSummary(),
                resume.getProjectsSummary(),
                null,
                true,
                null
        );

        return resumeVersionRepository.save(base);
    }

    private String extractSummarySeed(Resume resume) {
        if (resume.getRawText() != null && !resume.getRawText().isBlank()) {
            String text = resume.getRawText().trim();
            String[] lines = text.split("\n");
            StringBuilder summaryBuilder = new StringBuilder();
            int count = 0;
            for (String line : lines) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty() && !trimmed.matches("(?i)^(resume|curriculum vitae|cv|page \\d+).*")) {
                    summaryBuilder.append(trimmed).append(" ");
                    count++;
                    if (count >= 3 || summaryBuilder.length() > 250) {
                        break;
                    }
                }
            }
            return summaryBuilder.toString().trim();
        }
        return "Experienced professional dedicated to delivering high-impact results.";
    }

    private ResumeVersionComparisonResponse.SectionDiff buildSectionDiff(String name, String src, String tgt) {
        String s = src != null ? src.trim() : "";
        String t = tgt != null ? tgt.trim() : "";
        boolean modified = !s.equals(t);

        int srcWords = s.isEmpty() ? 0 : s.split("\\s+").length;
        int tgtWords = t.isEmpty() ? 0 : t.split("\\s+").length;

        return new ResumeVersionComparisonResponse.SectionDiff(
                name,
                modified,
                s,
                t,
                srcWords,
                tgtWords,
                tgtWords - srcWords
        );
    }

    private Set<String> parseSkillsToSet(String skills) {
        if (skills == null || skills.isBlank()) {
            return Collections.emptySet();
        }
        String[] parts = skills.split("[,;\\n•\\-*]+");
        return Arrays.stream(parts)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase)
                .collect(Collectors.toSet());
    }

    private boolean containsSkill(String existingSkills, String targetSkill) {
        Set<String> set = parseSkillsToSet(existingSkills);
        return set.contains(targetSkill.trim().toLowerCase());
    }

    private String applyBulletToContent(String currentContent, String newBullet, String originalText, String action) {
        String bulletFormatted = newBullet.startsWith("•") || newBullet.startsWith("-")
                ? newBullet
                : "• " + newBullet;

        if (currentContent == null || currentContent.isBlank()) {
            return bulletFormatted;
        }

        if ("REPLACE".equalsIgnoreCase(action) && originalText != null && !originalText.isBlank()) {
            String cleanOrig = originalText.trim();
            if (currentContent.contains(cleanOrig)) {
                return currentContent.replace(cleanOrig, newBullet.replaceFirst("^[•\\-*]\\s*", ""));
            }
        }

        if ("PREPEND".equalsIgnoreCase(action)) {
            return bulletFormatted + "\n" + currentContent.trim();
        }

        return currentContent.trim() + "\n" + bulletFormatted;
    }

    public record PdfExportResult(
            byte[] pdfBytes,
            String filename
    ) {}
}

