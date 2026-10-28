package com.careerpilot.service;

import com.careerpilot.dto.ResumeAnalysisResponse;
import com.careerpilot.dto.ResumeResponse;
import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.User;
import com.careerpilot.exception.BadRequestException;
import com.careerpilot.exception.ResourceNotFoundException;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ResumeTextExtractionService extractionService;

    public ResumeService(
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            FileStorageService fileStorageService,
            ResumeTextExtractionService extractionService
    ) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.extractionService = extractionService;
    }

    public ResumeResponse uploadResume(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        FileStorageService.StorageResult storageResult = fileStorageService.storeResume(userId, file);

        Resume resume = new Resume(
                user,
                storageResult.originalFilename(),
                storageResult.storageKey(),
                storageResult.contentType(),
                storageResult.fileSize(),
                ResumeStatus.UPLOADED
        );

        Resume saved = resumeRepository.save(resume);
        return ResumeResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ResumeResponse> listResumes(UUID userId) {
        List<Resume> resumes = resumeRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return resumes.stream()
                .map(ResumeResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeResponse getResume(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findByIdAndUserId(resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));
        return ResumeResponse.fromEntity(resume);
    }

    @Transactional(readOnly = true)
    public ResumeDownload downloadResume(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findByIdAndUserId(resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));

        Resource resource = fileStorageService.loadAsResource(userId, resume.getStorageKey());
        return new ResumeDownload(resource, resume.getOriginalFilename(), resume.getContentType(), resume.getFileSize());
    }

    public void deleteResume(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findByIdAndUserId(resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));

        fileStorageService.deleteFile(userId, resume.getStorageKey());
        resumeRepository.delete(resume);
    }

    @Transactional(noRollbackFor = BadRequestException.class)
    public ResumeAnalysisResponse parseResume(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findByIdAndUserId(resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));

        Resource resource = fileStorageService.loadAsResource(userId, resume.getStorageKey());

        try {
            ResumeTextExtractionService.ExtractedResumeData extracted =
                    extractionService.extractAndParse(resource, resume.getOriginalFilename());

            resume.setRawText(extracted.rawText());
            resume.setSkillsSummary(extracted.skillsSummary());
            resume.setExperienceSummary(extracted.experienceSummary());
            resume.setEducationSummary(extracted.educationSummary());
            resume.setProjectsSummary(extracted.projectsSummary());
            resume.setStatus(ResumeStatus.PARSED);
            resume.setParsingError(null);
            resume.setParsedAt(Instant.now());

            Resume saved = resumeRepository.save(resume);
            return ResumeAnalysisResponse.fromEntity(saved);
        } catch (BadRequestException e) {
            resume.setStatus(ResumeStatus.FAILED);
            resume.setParsingError(e.getMessage());
            resume.setParsedAt(Instant.now());
            resumeRepository.save(resume);
            throw e;
        } catch (Exception e) {
            String errorMsg = "Text extraction failed unexpectedly: " + e.getMessage();
            resume.setStatus(ResumeStatus.FAILED);
            resume.setParsingError(errorMsg);
            resume.setParsedAt(Instant.now());
            resumeRepository.save(resume);
            throw new BadRequestException(errorMsg);
        }
    }

    @Transactional(readOnly = true)
    public ResumeAnalysisResponse getResumeAnalysis(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findByIdAndUserId(resumeId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));
        return ResumeAnalysisResponse.fromEntity(resume);
    }

    public record ResumeDownload(
            Resource resource,
            String originalFilename,
            String contentType,
            long fileSize
    ) {}
}
