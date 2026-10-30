package com.careerpilot.controller;

import com.careerpilot.dto.ResumeAnalysisResponse;
import com.careerpilot.dto.ResumeImprovementRequest;
import com.careerpilot.dto.ResumeImprovementResponse;
import com.careerpilot.dto.ResumeMatchRequest;
import com.careerpilot.dto.ResumeMatchResponse;
import com.careerpilot.dto.RenameResumeRequest;
import com.careerpilot.dto.ResumeResponse;
import com.careerpilot.security.UserPrincipal;
import com.careerpilot.service.ResumeImprovementService;
import com.careerpilot.service.ResumeJobMatchingService;
import com.careerpilot.service.ResumeService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/resumes")
public class ResumeController {

    private final ResumeService resumeService;
    private final ResumeJobMatchingService resumeJobMatchingService;
    private final ResumeImprovementService resumeImprovementService;

    public ResumeController(
            ResumeService resumeService,
            ResumeJobMatchingService resumeJobMatchingService,
            ResumeImprovementService resumeImprovementService
    ) {
        this.resumeService = resumeService;
        this.resumeJobMatchingService = resumeJobMatchingService;
        this.resumeImprovementService = resumeImprovementService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeResponse> uploadResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        ResumeResponse response = resumeService.uploadResume(principal.getId(), file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ResumeResponse>> listResumes(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<ResumeResponse> resumes = resumeService.listResumes(principal.getId());
        return ResponseEntity.ok(resumes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResumeResponse> getResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        ResumeResponse resume = resumeService.getResume(principal.getId(), id);
        return ResponseEntity.ok(resume);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        ResumeService.ResumeDownload download = resumeService.downloadResume(principal.getId(), id);

        ContentDisposition contentDisposition = ContentDisposition.attachment()
                .filename(download.originalFilename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .contentType(MediaType.parseMediaType(download.contentType()))
                .contentLength(download.fileSize())
                .body(download.resource());
    }

    @PostMapping("/{id}/parse")
    public ResponseEntity<ResumeAnalysisResponse> parseResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        ResumeAnalysisResponse analysis = resumeService.parseResume(principal.getId(), id);
        return ResponseEntity.ok(analysis);
    }

    @GetMapping("/{id}/analysis")
    public ResponseEntity<ResumeAnalysisResponse> getResumeAnalysis(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        ResumeAnalysisResponse analysis = resumeService.getResumeAnalysis(principal.getId(), id);
        return ResponseEntity.ok(analysis);
    }

    @PostMapping("/{id}/match")
    public ResponseEntity<ResumeMatchResponse> matchResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody ResumeMatchRequest request
    ) {
        ResumeMatchResponse response = resumeJobMatchingService.matchResume(principal.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/improve")
    public ResponseEntity<ResumeImprovementResponse> improveResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody ResumeImprovementRequest request
    ) {
        ResumeImprovementResponse response = resumeImprovementService.improveResume(principal.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/improvements/latest")
    public ResponseEntity<ResumeImprovementResponse> getLatestImprovement(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        ResumeImprovementResponse response = resumeImprovementService.getLatestImprovement(principal.getId(), id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/rename")
    public ResponseEntity<ResumeResponse> renameResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody RenameResumeRequest request
    ) {
        ResumeResponse response = resumeService.renameResume(principal.getId(), id, request.filename());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        resumeService.deleteResume(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
