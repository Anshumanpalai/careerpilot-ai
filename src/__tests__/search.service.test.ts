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

import { searchService, SearchService } from "@/services/search.service";
import { applicationsService } from "@/services/applications.service";
import { resumeService } from "@/services/resume.service";
import { ApplicationStatus, JobApplication } from "@/types/applications.types";
import { ResumeRecord } from "@/types/resume.types";

describe("SearchService (Global Search)", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockLocalStorage.setItem("careerpilot_auth_token", "test-valid-jwt-token");
    vi.restoreAllMocks();
  });

  const mockApp: JobApplication = {
    id: "app-uuid-1",
    companyName: "Stripe",
    jobTitle: "Staff Software Engineer",
    status: "INTERVIEWING",
    location: "San Francisco, CA",
    employmentType: "REMOTE",
    salaryRange: "$240,000 - $280,000",
    appliedDate: "2026-10-20",
    notes: "System design round scheduled",
    matchScore: 92,
  };

  const mockResume: ResumeRecord = {
    id: "resume-uuid-1",
    originalFilename: "John_Doe_Staff_SWE_Resume.pdf",
    contentType: "application/pdf",
    fileSize: 64200,
    status: "PARSED",
    createdAt: "2026-10-15T12:00:00Z",
    updatedAt: "2026-10-15T12:00:00Z",
  };

  describe("Status Badge Mapping", () => {
    it("maps all 6 application statuses to their proper badges without error", () => {
      const statuses: ApplicationStatus[] = [
        "SAVED",
        "APPLIED",
        "SCREENING",
        "INTERVIEWING",
        "OFFER",
        "REJECTED",
      ];

      for (const st of statuses) {
        const badge = SearchService.mapStatusBadge(st);
        expect(badge.label).toBeDefined();
        expect(badge.variant).toBeDefined();
        if (st === "OFFER") expect(badge.variant).toBe("success");
        if (st === "INTERVIEWING") expect(badge.variant).toBe("purple");
        if (st === "SCREENING") expect(badge.variant).toBe("info");
        if (st === "APPLIED") expect(badge.variant).toBe("default");
        if (st === "SAVED") expect(badge.variant).toBe("secondary");
        if (st === "REJECTED") expect(badge.variant).toBe("destructive");
      }
    });
  });

  describe("Search Execution & Data Mapping", () => {
    it("returns empty result group for blank or whitespace query without network calls", async () => {
      const getAppsSpy = vi.spyOn(applicationsService, "getApplications");
      const listResumesSpy = vi.spyOn(resumeService, "listResumes");

      const result = await searchService.search("   ");

      expect(getAppsSpy).not.toHaveBeenCalled();
      expect(listResumesSpy).not.toHaveBeenCalled();
      expect(result.totalCount).toBe(0);
      expect(result.applications).toHaveLength(0);
      expect(result.resumes).toHaveLength(0);
    });

    it("queries applications and resumes concurrently and maps results accurately", async () => {
      vi.spyOn(applicationsService, "getApplications").mockResolvedValueOnce([mockApp]);
      vi.spyOn(resumeService, "listResumes").mockResolvedValueOnce([mockResume]);

      const result = await searchService.search("Stripe");

      expect(result.totalCount).toBe(1); // Stripe app matches; resume filename doesn't contain "Stripe"
      expect(result.applications).toHaveLength(1);
      expect(result.applications[0].title).toBe("Stripe — Staff Software Engineer");
      expect(result.applications[0].url).toContain("/dashboard/applications?query=Stripe");
      expect(result.applications[0].statusBadge?.label).toBe("Interviewing");
      expect(result.applications[0].statusBadge?.variant).toBe("purple");
      expect(result.applications[0].details).toBe("System design round scheduled");
    });

    it("matches resumes by filename and constructs correct URL and details", async () => {
      vi.spyOn(applicationsService, "getApplications").mockResolvedValueOnce([]);
      vi.spyOn(resumeService, "listResumes").mockResolvedValueOnce([mockResume]);

      // Search matching resume filename
      const filenameResult = await searchService.search("John_Doe");
      expect(filenameResult.resumes).toHaveLength(1);
      expect(filenameResult.resumes[0].title).toBe("John_Doe_Staff_SWE_Resume.pdf");
      expect(filenameResult.resumes[0].url).toBe("/dashboard/resume");
      expect(filenameResult.resumes[0].statusBadge?.label).toBe("Parsed");
      expect(filenameResult.resumes[0].details).toBe("Status: PARSED");
    });

    it("passes AbortSignal to both application and resume services", async () => {
      const getAppsSpy = vi.spyOn(applicationsService, "getApplications").mockResolvedValueOnce([]);
      const listResumesSpy = vi.spyOn(resumeService, "listResumes").mockResolvedValueOnce([]);

      const controller = new AbortController();
      await searchService.search("Google", { signal: controller.signal });

      expect(getAppsSpy).toHaveBeenCalledWith({ query: "Google" }, { signal: controller.signal });
      expect(listResumesSpy).toHaveBeenCalledWith({ signal: controller.signal });
    });
  });
});

