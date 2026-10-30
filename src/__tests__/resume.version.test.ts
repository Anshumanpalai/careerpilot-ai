import { describe, it, expect, beforeEach, vi } from "vitest";

// Lightweight browser environment shim
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => {
    storage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
  key: (i: number) => Object.keys(storage)[i] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};

globalThis.localStorage = mockLocalStorage as Storage;

if (typeof window === "undefined") {
  globalThis.window = {
    location: { origin: "http://localhost:5174" } as Location,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    URL: {
      createObjectURL: vi.fn(() => "blob:http://localhost:5174/mock-uuid"),
      revokeObjectURL: vi.fn(),
    },
  } as unknown as Window & typeof globalThis;
} else if (!window.URL || !window.URL.createObjectURL) {
  window.URL = {
    ...window.URL,
    createObjectURL: vi.fn(() => "blob:http://localhost:5174/mock-uuid"),
    revokeObjectURL: vi.fn(),
  } as unknown as typeof URL;
}

if (typeof document === "undefined") {
  const dummyEl = {
    set href(_val: string) {},
    set download(_val: string) {},
    click: vi.fn(),
  };
  globalThis.document = {
    body: {
      appendChild: vi.fn((node) => node),
      removeChild: vi.fn((node) => node),
    },
    createElement: vi.fn((_tag: string) => dummyEl),
  } as unknown as Document;
}

import { apiClient } from "@/lib/api-client";
import { resumeService } from "@/services/resume.service";
import {
  ResumeVersion,
  ResumeVersionComparison,
  CreateResumeVersionRequest,
  UpdateResumeVersionRequest,
  ApplyAiSuggestionRequest,
} from "@/types/resume.types";

describe("Phase 6: Resume Versioning & ATS PDF Export Service", () => {
  const resumeId = "res-uuid-1";
  const versionId = "ver-uuid-101";

  const mockVersion1: ResumeVersion = {
    id: versionId,
    resumeId,
    versionNumber: 1,
    versionName: "v1 - Baseline (Uploaded)",
    targetRole: "Senior Backend Engineer",
    targetCompany: "Acme Corp",
    summary: "Senior backend engineer with 5 years in Java and Spring Boot.",
    skills: "Java 21, Spring Boot 3.4, PostgreSQL, Docker",
    experience: "• Led distributed transactions service\n• Reduced query latency by 35%",
    education: "B.S. in Computer Science",
    projects: "• CareerPilot AI: Career copilot backend",
    customSections: "AWS Certified Developer",
    isBaseVersion: true,
    parentVersionId: null,
    parentVersionNumber: null,
    wordCount: 38,
    characterCount: 260,
    createdAt: "2026-10-28T10:00:00Z",
    updatedAt: "2026-10-28T10:00:00Z",
  };

  const mockVersion2: ResumeVersion = {
    id: "ver-uuid-102",
    resumeId,
    versionNumber: 2,
    versionName: "v2 - Tailored Google",
    targetRole: "Staff Distributed Systems Engineer",
    targetCompany: "Google",
    summary: "Architected ultra-low latency distributed cloud infrastructure.",
    skills: "Java 21, Spring Boot 3.4, PostgreSQL, Docker, Kubernetes, Kafka",
    experience: "• Scaled system to 250,000 req/sec\n• Reduced tail latency from 80ms to 12ms",
    education: "B.S. in Computer Science",
    projects: "• CloudRouter: Low-latency routing protocol",
    customSections: "AWS Certified Solutions Architect",
    isBaseVersion: false,
    parentVersionId: versionId,
    parentVersionNumber: 1,
    wordCount: 45,
    characterCount: 310,
    createdAt: "2026-10-28T10:30:00Z",
    updatedAt: "2026-10-28T10:30:00Z",
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("careerpilot_auth_token", "test-valid-jwt");
    vi.restoreAllMocks();
  });

  it("lists all versions for a resume via GET /api/v1/resumes/:id/versions", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue([mockVersion2, mockVersion1]);

    const result = await resumeService.listVersions(resumeId);

    expect(getSpy).toHaveBeenCalledWith(`/resumes/${resumeId}/versions`);
    expect(result).toHaveLength(2);
    expect(result[0].versionNumber).toBe(2);
    expect(result[1].isBaseVersion).toBe(true);
  });

  it("retrieves a single version by ID via GET /api/v1/resumes/:id/versions/:vId", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockVersion1);

    const result = await resumeService.getVersion(resumeId, versionId);

    expect(getSpy).toHaveBeenCalledWith(`/resumes/${resumeId}/versions/${versionId}`);
    expect(result.id).toBe(versionId);
    expect(result.versionName).toBe("v1 - Baseline (Uploaded)");
  });

  it("creates a new independent version via POST /api/v1/resumes/:id/versions", async () => {
    const createReq: CreateResumeVersionRequest = {
      versionName: "v2 - Frontend Specialization",
      targetRole: "Frontend Lead",
      summary: "Modern React 19 Architect.",
      skills: "React, TypeScript, Tailwind",
    };

    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
      ...mockVersion1,
      id: "ver-uuid-103",
      versionNumber: 2,
      versionName: createReq.versionName,
      targetRole: createReq.targetRole,
      isBaseVersion: false,
    });

    const result = await resumeService.createVersion(resumeId, createReq);

    expect(postSpy).toHaveBeenCalledWith(`/resumes/${resumeId}/versions`, createReq);
    expect(result.versionName).toBe("v2 - Frontend Specialization");
    expect(result.isBaseVersion).toBe(false);
  });

  it("updates an existing version via PUT /api/v1/resumes/:id/versions/:vId", async () => {
    const updateReq: UpdateResumeVersionRequest = {
      versionName: "v1 - Refined Executive Draft",
      targetRole: "Staff Backend Engineer",
      summary: "Refined summary with metrics.",
    };

    const putSpy = vi.spyOn(apiClient, "put").mockResolvedValue({
      ...mockVersion1,
      versionName: updateReq.versionName,
      targetRole: updateReq.targetRole,
      summary: updateReq.summary,
    });

    const result = await resumeService.updateVersion(resumeId, versionId, updateReq);

    expect(putSpy).toHaveBeenCalledWith(`/resumes/${resumeId}/versions/${versionId}`, updateReq);
    expect(result.versionName).toBe("v1 - Refined Executive Draft");
    expect(result.targetRole).toBe("Staff Backend Engineer");
  });

  it("duplicates an existing version with lineage via POST /duplicate", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(mockVersion2);

    const result = await resumeService.duplicateVersion(resumeId, versionId, {
      newVersionName: "v2 - Tailored Google",
      targetCompany: "Google",
    });

    expect(postSpy).toHaveBeenCalledWith(
      `/resumes/${resumeId}/versions/${versionId}/duplicate`,
      { newVersionName: "v2 - Tailored Google", targetCompany: "Google" }
    );
    expect(result.parentVersionId).toBe(versionId);
    expect(result.parentVersionNumber).toBe(1);
  });

  it("restores a historical version by creating a NEW version without mutating history", async () => {
    const restoredVersion: ResumeVersion = {
      ...mockVersion1,
      id: "ver-uuid-104",
      versionNumber: 3,
      versionName: "v3 - Restored Baseline",
      parentVersionId: versionId,
      parentVersionNumber: 1,
      isBaseVersion: false,
    };

    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(restoredVersion);

    const result = await resumeService.restoreVersion(resumeId, versionId, {
      newVersionName: "v3 - Restored Baseline",
    });

    expect(postSpy).toHaveBeenCalledWith(
      `/resumes/${resumeId}/versions/${versionId}/restore`,
      { newVersionName: "v3 - Restored Baseline" }
    );
    expect(result.versionNumber).toBe(3);
    expect(result.versionName).toBe("v3 - Restored Baseline");
    expect(result.parentVersionId).toBe(versionId);
  });

  it("deletes a version via DELETE /api/v1/resumes/:id/versions/:vId", async () => {
    const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValue(undefined);

    await resumeService.deleteVersion(resumeId, "ver-uuid-102");

    expect(deleteSpy).toHaveBeenCalledWith(`/resumes/${resumeId}/versions/ver-uuid-102`);
  });

  it("compares two versions and calculates section diffs and skill deltas", async () => {
    const mockComparison: ResumeVersionComparison = {
      sourceVersion: mockVersion1,
      targetVersion: mockVersion2,
      summaryDiff: {
        sectionName: "Professional Summary",
        isModified: true,
        sourceText: mockVersion1.summary,
        targetText: mockVersion2.summary,
        sourceWords: 10,
        targetWords: 12,
        wordCountDelta: 2,
      },
      skillsDiff: {
        sectionName: "Skills",
        isModified: true,
        sourceText: mockVersion1.skills,
        targetText: mockVersion2.skills,
        sourceWords: 7,
        targetWords: 9,
        wordCountDelta: 2,
      },
      experienceDiff: {
        sectionName: "Experience",
        isModified: true,
        sourceText: mockVersion1.experience,
        targetText: mockVersion2.experience,
        sourceWords: 12,
        targetWords: 15,
        wordCountDelta: 3,
      },
      educationDiff: {
        sectionName: "Education",
        isModified: false,
        sourceText: mockVersion1.education,
        targetText: mockVersion2.education,
        sourceWords: 5,
        targetWords: 5,
        wordCountDelta: 0,
      },
      projectsDiff: {
        sectionName: "Projects",
        isModified: true,
        sourceText: mockVersion1.projects,
        targetText: mockVersion2.projects,
        sourceWords: 5,
        targetWords: 6,
        wordCountDelta: 1,
      },
      wordCountDelta: 7,
      characterCountDelta: 50,
      addedSkills: ["kafka", "kubernetes"],
      removedSkills: [],
    };

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockComparison);

    const comparison = await resumeService.compareVersions(resumeId, versionId, "ver-uuid-102");

    expect(getSpy).toHaveBeenCalledWith(
      `/resumes/${resumeId}/versions/compare?source=${encodeURIComponent(
        versionId
      )}&target=${encodeURIComponent("ver-uuid-102")}`
    );
    expect(comparison.wordCountDelta).toBe(7);
    expect(comparison.addedSkills).toContain("kubernetes");
    expect(comparison.summaryDiff.isModified).toBe(true);
    expect(comparison.educationDiff.isModified).toBe(false);
  });

  it("applies an AI suggestion to a draft version via POST /apply-suggestion", async () => {
    const applyReq: ApplyAiSuggestionRequest = {
      suggestionType: "SKILL",
      textToApply: "Kubernetes",
      targetSection: "skills",
      action: "APPEND",
    };

    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
      ...mockVersion1,
      skills: `${mockVersion1.skills}, Kubernetes`,
    });

    const result = await resumeService.applyAiSuggestion(resumeId, versionId, applyReq);

    expect(postSpy).toHaveBeenCalledWith(
      `/resumes/${resumeId}/versions/${versionId}/apply-suggestion`,
      applyReq
    );
    expect(result.skills).toContain("Kubernetes");
  });

  it("exports ATS-friendly PDF and initiates browser download", async () => {
    const mockBlob = new Blob(["%PDF-1.4 mock pdf content"], { type: "application/pdf" });
    const downloadBlobSpy = vi.spyOn(apiClient, "downloadBlob").mockResolvedValue({
      blob: mockBlob,
      filename: "Senior_Backend_Engineer_v1_ATS.pdf",
    });

    const clickSpy = vi.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: clickSpy,
    };

    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLElement);
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    await resumeService.exportVersionPdf(resumeId, versionId, "Custom_Resume.pdf");

    expect(downloadBlobSpy).toHaveBeenCalledWith(
      `/resumes/${resumeId}/versions/${versionId}/export-pdf`
    );
    expect(clickSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);
  });
});
