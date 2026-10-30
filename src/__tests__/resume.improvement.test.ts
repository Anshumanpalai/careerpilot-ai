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
  } as unknown as Window & typeof globalThis;
}

import { resumeService, formatImprovementErrorMessage } from "@/services/resume.service";
import { ResumeImprovementResponse } from "@/types/resume.types";
import { ApiError } from "@/types/api.types";

describe("Phase 5: AI Resume Improvement & Career Recommendations Service", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("careerpilot_auth_token", "test-valid-jwt");
    vi.restoreAllMocks();
  });

  const mockResponse: ResumeImprovementResponse = {
    id: "imp-uuid-1",
    resumeId: "res-uuid-1",
    targetRole: "Senior Backend Engineer",
    providerName: "openai",
    modelName: "gpt-4o-mini",
    improvedSummary: {
      original: "Backend engineer with 4 years experience.",
      suggested: "Performance-oriented Senior Backend Engineer with verified track record in Java and PostgreSQL.",
      rationale: "Aligns with required backend competencies while strictly preserving facts.",
    },
    bulletPointSuggestions: [
      {
        original: "Maintained database and backend queries.",
        suggested: "Engineered high-throughput relational schemas and optimized PostgreSQL query indexes.",
        rationale: "Replaced passive verbs with active technical leadership verbs.",
        requiresUserEvidence: true,
        evidencePrompt: "Please verify query throughput or latency reduction metrics before using.",
      },
    ],
    evidencedSkills: [
      {
        skill: "Java",
        category: "Programming Languages",
        evidenceSnippet: "4 years developing Java enterprise services",
      },
      {
        skill: "PostgreSQL",
        category: "Databases",
        evidenceSnippet: "Engineered relational schemas in PostgreSQL",
      },
    ],
    learningGaps: [
      {
        missingRequirement: "Kubernetes",
        importance: "REQUIRED",
        reason: "Container orchestration is required by job description but not in candidate's verified background.",
      },
      {
        missingRequirement: "AWS",
        importance: "PREFERRED",
        reason: "Cloud deployment is preferred but absent from resume.",
      },
    ],
    prioritizedRecommendations: [
      {
        priority: "HIGH",
        title: "Close Kubernetes Experience Gap",
        actionableAdvice: "Build and document a hands-on project running Spring Boot on Minikube.",
      },
    ],
    learningRoadmap: [
      {
        skill: "Kubernetes",
        actionSteps: ["Deploy Spring Boot container", "Configure Services & Ingress"],
        estimatedTimeToAcquire: "2-3 weeks",
        recommendedTopics: ["Pods", "Deployments", "Services"],
      },
    ],
    complianceNotice: "Disclaimer: All AI suggestions preserve the candidate's verified background. Original resume remains immutable.",
    createdAt: "2026-10-27T10:00:00Z",
  };

  it("improveResume successfully posts resumeId, jobDescription, and userConsent to backend", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await resumeService.improveResume("res-uuid-1", {
      jobDescription: "Job description with at least fifty characters for valid request validation test.",
      userConsent: true,
      targetRole: "Senior Backend Engineer",
    });

    expect(result).toBeDefined();
    expect(result.id).toBe("imp-uuid-1");
    expect(result.providerName).toBe("openai");
    expect(result.modelName).toBe("gpt-4o-mini");
    expect(result.bulletPointSuggestions).toHaveLength(1);
    expect(result.bulletPointSuggestions[0].requiresUserEvidence).toBe(true);
    expect(result.bulletPointSuggestions[0].evidencePrompt).toContain("Please verify");

    // Check separation between evidenced skills and learning gaps
    expect(result.evidencedSkills).toHaveLength(2);
    expect(result.evidencedSkills[0].skill).toBe("Java");
    expect(result.learningGaps).toHaveLength(2);
    expect(result.learningGaps[0].missingRequirement).toBe("Kubernetes");

    // Verify fetch call payload
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledUrl).toBe("http://localhost:5174/api/v1/resumes/res-uuid-1/improve");
    const body = JSON.parse(calledOptions.body);
    expect(body.userConsent).toBe(true);
    expect(body.targetRole).toBe("Senior Backend Engineer");
    expect(calledOptions.signal).toBeDefined();
  });

  it("apiClient aborts and throws HTTP 408 ApiError when request times out", async () => {
    globalThis.fetch = vi.fn().mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const error = new Error("The operation was aborted due to timeout");
          error.name = "AbortError";
          setTimeout(() => reject(error), 20);
        })
    );

    await expect(
      resumeService.improveResume(
        "res-uuid-1",
        {
          jobDescription: "Valid job description length for testing timeout behavior...",
          userConsent: true,
        },
        { timeoutMs: 5 }
      )
    ).rejects.toThrow("Request timed out");
  });

  it("getLatestImprovement returns existing report when available", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await resumeService.getLatestImprovement("res-uuid-1");
    expect(result).toBeDefined();
    expect(result?.resumeId).toBe("res-uuid-1");
  });

  it("getLatestImprovement returns null when no report exists (404)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: "No AI improvement recommendations found" }),
    } as unknown as Response);

    const result = await resumeService.getLatestImprovement("res-uuid-1");
    expect(result).toBeNull();
  });

  describe("formatImprovementErrorMessage", () => {
    it("formats HTTP 429 rate limit exceeded", () => {
      const err = new ApiError("Rate limit reached. You can make at most 5 resume improvement requests per minute.", 429);
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("Rate limit reached");
    });

    it("formats HTTP 503 AI provider disabled or unconfigured", () => {
      const err = new ApiError("The AI Resume Improvement service is currently disabled or unconfigured on the server (AI_ENABLED=false).", 503);
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("disabled or unconfigured");
      expect(formatted).toContain("AI_ENABLED=false");
    });

    it("formats HTTP 502 bad gateway or malformed provider response", () => {
      const err = new ApiError("Failed to parse structured recommendations from AI provider response", 502);
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("Failed to parse structured recommendations");
    });

    it("formats HTTP 400 validation error with field errors", () => {
      const err = new ApiError("Validation failed", 400, {
        userConsent: "Explicit user consent is required to process resume data with an external AI service.",
      });
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("Explicit user consent is required");
    });

    it("formats HTTP 401 unauthorized", () => {
      const err = new ApiError("Full authentication is required to access this resource", 401);
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("session has expired");
    });

    it("formats HTTP 403 access denied", () => {
      const err = new ApiError("You do not have permission to access or improve this resume.", 403);
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("do not have permission");
    });

    it("formats network connection error safely", () => {
      const formatted = formatImprovementErrorMessage(new Error("Failed to fetch"));
      expect(formatted).toContain("Unable to connect to the backend server");
    });

    it("formats HTTP 408 request timeout", () => {
      const err = new ApiError("Request timed out. The server or AI service took longer than expected to respond.", 408);
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("timed out");
      expect(formatted).toContain("longer than expected");
    });

    it("formats AbortError or client-side timeout message", () => {
      const err = new Error("The operation was aborted due to timeout");
      const formatted = formatImprovementErrorMessage(err);
      expect(formatted).toContain("timed out");
    });
  });
});
