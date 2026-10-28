package com.careerpilot.controller;

import com.careerpilot.dto.*;
import com.careerpilot.entity.ApplicationStatus;
import com.careerpilot.security.UserPrincipal;
import com.careerpilot.service.JobApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/applications")
public class JobApplicationController {

    private final JobApplicationService applicationService;

    public JobApplicationController(JobApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    public ResponseEntity<List<ApplicationResponse>> listApplications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(name = "status", required = false) ApplicationStatus status,
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "sortBy", required = false) String sortBy,
            @RequestParam(name = "sortOrder", required = false) String sortOrder
    ) {
        List<ApplicationResponse> list = applicationService.listApplications(
                principal.getId(),
                status,
                query,
                sortBy,
                sortOrder
        );
        return ResponseEntity.ok(list);
    }

    @GetMapping("/stats")
    public ResponseEntity<ApplicationStatsResponse> getStats(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ApplicationStatsResponse stats = applicationService.getStats(principal.getId());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        ApplicationResponse app = applicationService.getApplication(principal.getId(), id);
        return ResponseEntity.ok(app);
    }

    @PostMapping
    public ResponseEntity<ApplicationResponse> createApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateApplicationRequest request
    ) {
        ApplicationResponse created = applicationService.createApplication(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApplicationResponse> updateApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateApplicationRequest request
    ) {
        ApplicationResponse updated = applicationService.updateApplication(principal.getId(), id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApplicationResponse> updateStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateStatusRequest request
    ) {
        ApplicationResponse updated = applicationService.updateStatus(principal.getId(), id, request.status());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id
    ) {
        applicationService.deleteApplication(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
