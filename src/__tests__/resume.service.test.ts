import { describe, it, expect, beforeEach, vi } from "vitest";

// Lightweight browser environment shim for Node test runner
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
      createObjectURL: vi.fn(() => "blob:http://localhost:5174/mock-blob-url"),
      revokeObjectURL: vi.fn(),
    },
  } as unknown as Window & typeof globalThis;
} else if (!window.URL) {
  window.URL = {
    createObjectURL: vi.fn(() => "blob:http://localhost:5174/mock-blob-url"),
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

if (!globalThis.CustomEvent) {
  globalThis.CustomEvent = class CustomEvent<T = unknown> extends Event {
    public detail: T;
    constructor(type: string, options?: CustomEventInit<T>) {
      super(type, options);
      this.detail = options?.detail as T;
    }
  } as unknown as typeof CustomEvent;
}

import { resumeService } from "@/services/resume.service";
import { ResumeRecord } from "@/types/resume.types";

describe("ResumeService", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockLocalStorage.setItem("careerpilot_auth_token", "test-valid-jwt-token");
    vi.restoreAllMocks();
  });

  const mockResume: ResumeRecord = {
    id: "resume-uuid-1",
    originalFilename: "John_Doe_Staff_Engineer.pdf",
    contentType: "application/pdf",
    fileSize: 102400,
    status: "UPLOADED",
    createdAt: "2026-03-20T10:00:00Z",
    updatedAt: "2026-03-20T10:00:00Z",
  };

  it("uploadResume should upload a file via multipart request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockResume,
    } as Response);

    const mockFile = new File(["dummy pdf content"], "John_Doe_Staff_Engineer.pdf", {
      type: "application/pdf",
    });

    const result = await resumeService.uploadResume(mockFile);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/resumes");
    expect(calledInit.method).toBe("POST");
    expect(calledInit.body).toBeInstanceOf(FormData);
    expect(result).toEqual(mockResume);
  });

  it("listResumes should fetch the user's resumes", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockResume],
    } as Response);

    const result = await resumeService.listResumes();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/resumes");
    expect(result).toEqual([mockResume]);
  });

  it("getResume should fetch resume metadata by id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResume,
    } as Response);

    const result = await resumeService.getResume("resume-uuid-1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/resumes/resume-uuid-1");
    expect(result).toEqual(mockResume);
  });

  it("deleteResume should send DELETE to /resumes/:id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    await resumeService.deleteResume("resume-uuid-1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/resumes/resume-uuid-1");
    expect(calledInit.method).toBe("DELETE");
  });

  it("downloadResume should request binary blob and trigger document download", async () => {
    const mockBlob = new Blob(["mock-binary-pdf-content"], { type: "application/pdf" });
    const headers = new Headers();
    headers.set("Content-Disposition", 'attachment; filename="Downloaded_Resume.pdf"');

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: headers,
      blob: async () => mockBlob,
    } as unknown as Response);

    const clickSpy = vi.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: clickSpy,
    };

    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLElement);
    const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    await resumeService.downloadResume("resume-uuid-1", "Downloaded_Resume.pdf");

    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalledWith(mockAnchor);
    expect(removeSpy).toHaveBeenCalledWith(mockAnchor);
  });

  it("parseResume should send POST to /resumes/:id/parse and return analysis", async () => {
    const mockAnalysis = {
      id: "resume-uuid-1",
      originalFilename: "John_Doe_Staff_Engineer.pdf",
      status: "PARSED" as const,
      rawText: "John Doe\nExperience\nSoftware Engineer at Tech Corp",
      parsedAt: "2026-03-20T10:05:00Z",
      sections: {
        skills: "Java, TypeScript",
        experience: "Software Engineer at Tech Corp",
        education: "B.S. in Computer Science",
        projects: "CareerPilot AI",
      },
      parsingError: null,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAnalysis,
    } as Response);

    const result = await resumeService.parseResume("resume-uuid-1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/resumes/resume-uuid-1/parse");
    expect(calledInit.method).toBe("POST");
    expect(result).toEqual(mockAnalysis);
  });

  it("getResumeAnalysis should send GET to /resumes/:id/analysis and return analysis", async () => {
    const mockAnalysis = {
      id: "resume-uuid-1",
      originalFilename: "John_Doe_Staff_Engineer.pdf",
      status: "PARSED" as const,
      rawText: "Full resume text content",
      parsedAt: "2026-03-20T10:05:00Z",
      sections: {
        skills: "React, Spring Boot",
        experience: "Senior Dev",
        education: "MS CS",
        projects: "Portfolio",
      },
      parsingError: null,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAnalysis,
    } as Response);

    const result = await resumeService.getResumeAnalysis("resume-uuid-1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/resumes/resume-uuid-1/analysis");
    expect(result).toEqual(mockAnalysis);
  });

  it("matchResume should send POST to /resumes/:id/match with jobDescription and return structured match result", async () => {
    const mockMatchResponse = {
      resumeId: "resume-uuid-1",
      jobDescriptionLength: 120,
      matchScore: 85,
      scoringBreakdown: {
        overallScore: 85,
        requiredMatchRate: 80.0,
        preferredMatchRate: 100.0,
        matchedRequiredCount: 4,
        totalRequiredCount: 5,
        matchedPreferredCount: 2,
        totalPreferredCount: 2,
        formulaExplanation: "80% required + 20% preferred",
        limitations: ["Deterministic baseline matcher"],
      },
      matchedSkills: [
        {
          skillName: "Java",
          category: "Languages",
          requirementType: "REQUIRED" as const,
          matched: true,
          snippet: "... experienced in Java and Spring Boot ...",
        },
      ],
      undetectedSkills: [
        {
          skillName: "AWS",
          category: "Cloud & DevOps",
          requirementType: "REQUIRED" as const,
          matched: false,
          snippet: null,
        },
      ],
      recommendations: ["Consider adding AWS experience if proficient."],
      analyzedAt: "2026-03-20T10:10:00Z",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockMatchResponse,
    } as Response);

    const jd = "Requirements: 5+ years Java and Spring Boot experience. AWS preferred.";
    const result = await resumeService.matchResume("resume-uuid-1", jd);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/resumes/resume-uuid-1/match");
    expect(calledInit.method).toBe("POST");
    expect(JSON.parse(calledInit.body as string)).toEqual({ jobDescription: jd });
    expect(result).toEqual(mockMatchResponse);
    expect(result.matchScore).toBe(85);
    expect(result.matchedSkills[0].snippet).toContain("Java");
  });

  it("matchResume should handle error response from API gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        message: "Job description must be at least 50 characters long.",
      }),
    } as Response);

    await expect(
      resumeService.matchResume("resume-uuid-1", "Too short")
    ).rejects.toThrow("Job description must be at least 50 characters long.");
  });
});
