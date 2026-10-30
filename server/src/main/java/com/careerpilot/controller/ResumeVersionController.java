package com.careerpilot.controller;

import com.careerpilot.dto.*;
import com.careerpilot.security.UserPrincipal;
import com.careerpilot.service.ResumeVersionService;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/resumes/{resumeId}/versions")
public class ResumeVersionController {

    private final ResumeVersionService resumeVersionService;

    public ResumeVersionController(ResumeVersionService resumeVersionService) {
        this.resumeVersionService = resumeVersionService;
    }

    @GetMapping
    public ResponseEntity<List<ResumeVersionResponse>> listVersions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId
    ) {
        List<ResumeVersionResponse> versions = resumeVersionService.listVersions(principal.getId(), resumeId);
        return ResponseEntity.ok(versions);
    }

    @PostMapping
    public ResponseEntity<ResumeVersionResponse> createVersion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @Valid @RequestBody CreateResumeVersionRequest request
    ) {
        ResumeVersionResponse created = resumeVersionService.createVersion(principal.getId(), resumeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{versionId}")
    public ResponseEntity<ResumeVersionResponse> getVersion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @PathVariable("versionId") UUID versionId
    ) {
        ResumeVersionResponse version = resumeVersionService.getVersion(principal.getId(), resumeId, versionId);
        return ResponseEntity.ok(version);
    }

    @PutMapping("/{versionId}")
    public ResponseEntity<ResumeVersionResponse> updateVersion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @PathVariable("versionId") UUID versionId,
            @Valid @RequestBody UpdateResumeVersionRequest request
    ) {
        ResumeVersionResponse updated = resumeVersionService.updateVersion(principal.getId(), resumeId, versionId, request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{versionId}/duplicate")
    public ResponseEntity<ResumeVersionResponse> duplicateVersion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @PathVariable("versionId") UUID versionId,
            @Valid @RequestBody(required = false) DuplicateResumeVersionRequest request
    ) {
        ResumeVersionResponse duplicated = resumeVersionService.duplicateVersion(
                principal.getId(),
                resumeId,
                versionId,
                request != null ? request : new DuplicateResumeVersionRequest(null, null, null)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(duplicated);
    }

    @PostMapping("/{versionId}/restore")
    public ResponseEntity<ResumeVersionResponse> restoreVersion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @PathVariable("versionId") UUID versionId,
            @Valid @RequestBody(required = false) RestoreResumeVersionRequest request
    ) {
        ResumeVersionResponse restored = resumeVersionService.restoreVersion(
                principal.getId(),
                resumeId,
                versionId,
                request != null ? request : new RestoreResumeVersionRequest(null)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(restored);
    }

    @DeleteMapping("/{versionId}")
    public ResponseEntity<Void> deleteVersion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @PathVariable("versionId") UUID versionId
    ) {
        resumeVersionService.deleteVersion(principal.getId(), resumeId, versionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/compare")
    public ResponseEntity<ResumeVersionComparisonResponse> compareVersions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @RequestParam("source") UUID sourceId,
            @RequestParam("target") UUID targetId
    ) {
        ResumeVersionComparisonResponse comparison = resumeVersionService.compareVersions(
                principal.getId(),
                resumeId,
                sourceId,
                targetId
        );
        return ResponseEntity.ok(comparison);
    }

    @PostMapping("/{versionId}/apply-suggestion")
    public ResponseEntity<ResumeVersionResponse> applyAiSuggestion(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @PathVariable("versionId") UUID versionId,
            @Valid @RequestBody ApplyAiSuggestionRequest request
    ) {
        ResumeVersionResponse updated = resumeVersionService.applyAiSuggestion(
                principal.getId(),
                resumeId,
                versionId,
                request
        );
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{versionId}/export-pdf")
    public ResponseEntity<byte[]> exportVersionPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("resumeId") UUID resumeId,
            @PathVariable("versionId") UUID versionId
    ) {
        ResumeVersionService.PdfExportResult result = resumeVersionService.exportVersionPdf(
                principal.getId(),
                resumeId,
                versionId
        );

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(result.filename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(result.pdfBytes().length)
                .body(result.pdfBytes());
    }
}

