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

import { resumeService, formatMatchErrorMessage } from "@/services/resume.service";
import { ResumeMatchResponse } from "@/types/resume.types";
import { ApiError } from "@/types/api.types";

describe("Resume Matching Workflow & State Validation", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("careerpilot_auth_token", "test-jwt-token-xyz");
    vi.restoreAllMocks();
  });

  const validJd = `Senior Backend Engineer
Requirements:
- 5+ years building distributed applications in Java and Spring Boot
- Relational database schema design and tuning with PostgreSQL
- Microservices deployment using Docker and Kubernetes

Preferred Qualifications:
- Experience deploying to AWS cloud
- Message queue streaming using Kafka and Redis caching`;

  const mockSuccessfulResponse: ResumeMatchResponse = {
    resumeId: "resume-12345",
    jobDescriptionLength: validJd.length,
    matchScore: 82,
    scoringBreakdown: {
      overallScore: 82,
      requiredMatchRate: 85.0,
      preferredMatchRate: 70.0,
      matchedRequiredCount: 5,
      totalRequiredCount: 6,
      matchedPreferredCount: 2,
      totalPreferredCount: 3,
      formulaExplanation:
        "Weighted baseline: 80% weight on required qualifications + 20% weight on preferred qualifications.",
      limitations: [
        "Deterministic keyword and alias matcher",
        "Not an official ATS endorsement",
        "Absence does not imply incompetence",
        "Zero generative hallucination",
      ],
    },
    matchedSkills: [
      {
        skillName: "Java",
        category: "Programming Languages",
        requirementType: "REQUIRED",
        matched: true,
        snippet: "... 6 years hands-on experience in Java 17 and Spring Boot ...",
      },
      {
        skillName: "Spring Boot",
        category: "Frameworks/Libraries",
        requirementType: "REQUIRED",
        matched: true,
        snippet: "... architected Spring Boot microservices ...",
      },
      {
        skillName: "HTML",
        category: "Markup Languages",
        requirementType: "REQUIRED",
        matched: true,
        snippet: "... modern web applications using HTML5 and CSS3 ...",
      },
      {
        skillName: "CSS",
        category: "Stylesheet Languages",
        requirementType: "REQUIRED",
        matched: true,
        snippet: "... responsive styling using modern CSS3 animations ...",
      },
      {
        skillName: "PostgreSQL",
        category: "Databases & Storage",
        requirementType: "REQUIRED",
        matched: true,
        snippet: "... relational schema modeling in PostgreSQL ...",
      },
      {
        skillName: "Docker",
        category: "Cloud & DevOps",
        requirementType: "REQUIRED",
        matched: true,
        snippet: "... containerized applications with Docker ...",
      },
      {
        skillName: "AWS",
        category: "Cloud & DevOps",
        requirementType: "PREFERRED",
        matched: true,
        snippet: "... production deployments to AWS ECS and S3 ...",
      },
    ],
    undetectedSkills: [
      {
        skillName: "Kubernetes",
        category: "Cloud & DevOps",
        requirementType: "REQUIRED",
        matched: false,
        snippet: null,
      },
      {
        skillName: "Kafka",
        category: "Cloud & DevOps",
        requirementType: "PREFERRED",
        matched: false,
        snippet: null,
      },
    ],
    recommendations: [
      "Consider explicitly listing your hands-on experience with core requirement(s): Kubernetes if you possess practical proficiency.",
      "Highlighting preferred qualification(s): Kafka could help differentiate your resume for this role.",
    ],
    analyzedAt: "2026-03-20T10:15:00Z",
  };

  it("should execute matchResume with authorization header and post request body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSuccessfulResponse,
    } as Response);

    const response = await resumeService.matchResume("resume-12345", validJd);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];

    expect(calledUrl).toContain("/resumes/resume-12345/match");
    expect(calledInit?.method).toBe("POST");

    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-jwt-token-xyz");
    expect(headers["Content-Type"]).toBe("application/json");

    expect(JSON.parse(calledInit?.body as string)).toEqual({ jobDescription: validJd });
    expect(response.matchScore).toBe(82);
    expect(response.matchedSkills).toHaveLength(7);
    expect(response.undetectedSkills).toHaveLength(2);
  });

  it("should preserve verbatim evidence snippets without hallucination", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSuccessfulResponse,
    } as Response);

    const response = await resumeService.matchResume("resume-12345", validJd);

    const javaSkill = response.matchedSkills.find((s) => s.skillName === "Java");
    expect(javaSkill).toBeDefined();
    expect(javaSkill?.matched).toBe(true);
    expect(javaSkill?.snippet).toBe("... 6 years hands-on experience in Java 17 and Spring Boot ...");

    const k8sSkill = response.undetectedSkills.find((s) => s.skillName === "Kubernetes");
    expect(k8sSkill).toBeDefined();
    expect(k8sSkill?.matched).toBe(false);
    expect(k8sSkill?.snippet).toBeNull();
  });

  it("should correctly handle unparsed resume error (400 Bad Request)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        message: "The selected resume has not been parsed yet. Please parse the resume first before matching.",
      }),
    } as Response);

    await expect(resumeService.matchResume("resume-unparsed", validJd)).rejects.toThrow(
      "The selected resume has not been parsed yet. Please parse the resume first before matching."
    );
  });

  it("should correctly handle cross-user forbidden error (403 Forbidden)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({
        message: "You do not have permission to analyze this resume.",
      }),
    } as Response);

    await expect(resumeService.matchResume("other-user-resume", validJd)).rejects.toThrow(
      "You do not have permission to analyze this resume."
    );
  });

  it("should correctly handle too short job description error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        message: "Job description must be at least 50 characters long.",
      }),
    } as Response);

    await expect(resumeService.matchResume("resume-12345", "Need Java dev")).rejects.toThrow(
      "Job description must be at least 50 characters long."
    );
  });

  it("should verify structured breakdown components and transparent limitations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSuccessfulResponse,
    } as Response);

    const response = await resumeService.matchResume("resume-12345", validJd);

    expect(response.scoringBreakdown.requiredMatchRate).toBe(85.0);
    expect(response.scoringBreakdown.preferredMatchRate).toBe(70.0);
    expect(response.scoringBreakdown.formulaExplanation).toContain("80% weight on required");
    expect(response.scoringBreakdown.limitations).toContain("Deterministic keyword and alias matcher");
    expect(response.scoringBreakdown.limitations).toContain("Not an official ATS endorsement");
    expect(response.scoringBreakdown.limitations).toContain("Zero generative hallucination");
  });

  describe("formatMatchErrorMessage - Safe & Actionable Messages", () => {
    it("should format HTTP 400 with validationErrors or fieldErrors", () => {
      const fieldError = new ApiError("Validation failed", 400, {
        jobDescription: "Job description must be between 50 and 50,000 characters.",
      });
      expect(formatMatchErrorMessage(fieldError)).toBe(
        "Job description must be between 50 and 50,000 characters."
      );

      // Support alternative status property and validationErrors dictionary
      const validationErrorObj = {
        status: 400,
        validationErrors: {
          jobDescription: "Job description cannot be blank.",
        },
      };
      expect(formatMatchErrorMessage(validationErrorObj)).toBe(
        "Job description cannot be blank."
      );

      const unparsedError = new ApiError(
        "The selected resume has not been parsed yet. Please parse the resume first before matching.",
        400
      );
      expect(formatMatchErrorMessage(unparsedError)).toBe(
        "The selected resume has not been parsed yet. Please parse the resume first before matching."
      );
    });

    it("should format HTTP 401 with re-authentication prompt", () => {
      const err = new ApiError("Full authentication is required", 401);
      expect(formatMatchErrorMessage(err)).toBe(
        "Your session has expired or is unauthenticated. Please sign in again to analyze your resume."
      );

      const statusObj = { status: 401 };
      expect(formatMatchErrorMessage(statusObj)).toBe(
        "Your session has expired or is unauthenticated. Please sign in again to analyze your resume."
      );
    });

    it("should format HTTP 403 with access denied prompt", () => {
      const err = new ApiError("Access is denied", 403);
      expect(formatMatchErrorMessage(err)).toBe(
        "Access denied. You do not have permission to analyze this resume document."
      );

      const customDenied = new ApiError("You do not have permission to analyze this resume.", 403);
      expect(formatMatchErrorMessage(customDenied)).toBe(
        "You do not have permission to analyze this resume."
      );
    });

    it("should format HTTP 404 with resource/endpoint not found prompt", () => {
      const err = new ApiError("Not Found", 404);
      expect(formatMatchErrorMessage(err)).toBe(
        "The requested resume or matching endpoint was not found (HTTP 404). Please ensure the backend is running and the resume exists."
      );

      const notFoundObj = new ApiError("Resume not found with id: '123'", 404);
      expect(formatMatchErrorMessage(notFoundObj)).toBe("Resume not found with id: '123'");
    });

    it("should format HTTP 500 without leaking stack traces or internal secrets", () => {
      const err = new ApiError(
        "NullPointerException at com.careerpilot.service.ResumeService.match(ResumeService.java:42)",
        500
      );
      const formatted = formatMatchErrorMessage(err);
      expect(formatted).toBe(
        "The server encountered an unexpected error while analyzing your resume. Please verify the backend service is up to date and try again."
      );
      expect(formatted).not.toContain("NullPointerException");
      expect(formatted).not.toContain("at com.");
    });

    it("should format HTTP 502-504 as server unreachable", () => {
      const err502 = { status: 502, message: "Bad Gateway" };
      expect(formatMatchErrorMessage(err502)).toBe(
        "The backend service is temporarily unreachable. Please check that the Spring Boot server is running on port 8080 and try again."
      );

      const err504 = new ApiError("Gateway Timeout", 504);
      expect(formatMatchErrorMessage(err504)).toBe(
        "The backend service is temporarily unreachable. Please check that the Spring Boot server is running on port 8080 and try again."
      );
    });

    it("should format network/connection failure (status 0)", () => {
      const err = new ApiError("Failed to fetch", 0);
      expect(formatMatchErrorMessage(err)).toBe(
        "Unable to communicate with the server. Please check your network connection and ensure the backend is running on port 8080."
      );
    });
  });

  describe("Resume Match Result Schema & Accurate Category Modeling", () => {
    it("should retain corrected technical categories and verbatim snippets in match response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessfulResponse,
      } as Response);

      const result = await resumeService.matchResume("resume-12345", validJd);

      // Verify Programming Languages
      const java = result.matchedSkills.find((s) => s.skillName === "Java");
      expect(java?.category).toBe("Programming Languages");

      // Verify Frameworks/Libraries
      const springBoot = result.matchedSkills.find((s) => s.skillName === "Spring Boot");
      expect(springBoot?.category).toBe("Frameworks/Libraries");

      // Verify Markup Languages with verbatim HTML5 excerpt
      const html = result.matchedSkills.find((s) => s.skillName === "HTML");
      expect(html?.category).toBe("Markup Languages");
      expect(html?.snippet).toContain("HTML5");

      // Verify Stylesheet Languages with verbatim CSS3 excerpt
      const css = result.matchedSkills.find((s) => s.skillName === "CSS");
      expect(css?.category).toBe("Stylesheet Languages");
      expect(css?.snippet).toContain("CSS3");

      // Verify Requirement Tiers
      expect(java?.requirementType).toBe("REQUIRED");
      const aws = result.matchedSkills.find((s) => s.skillName === "AWS");
      expect(aws?.requirementType).toBe("PREFERRED");
    });
  });
});
