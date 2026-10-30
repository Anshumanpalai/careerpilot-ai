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
  } as unknown as Window & typeof globalThis;
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

import { applicationsService } from "@/services/applications.service";
import { ApplicationStats, ApplicationStatus, JobApplication } from "@/types/applications.types";
import { validateApplicationForm } from "@/utils/application-validation";

describe("ApplicationsService", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockLocalStorage.setItem("careerpilot_auth_token", "test-valid-jwt-token");
    vi.restoreAllMocks();
  });

  const mockApp: JobApplication = {
    id: "app-uuid-1",
    companyName: "Google",
    jobTitle: "Staff Software Engineer",
    status: "INTERVIEWING",
    location: "Mountain View, CA",
    employmentType: "HYBRID",
    salaryRange: "$240k - $300k",
    appliedDate: "2026-03-10",
    notes: "Round 2 scheduled",
    matchScore: 92,
  };

  it("getApplications should fetch applications from /applications with query parameters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockApp],
    } as Response);

    const result = await applicationsService.getApplications({
      status: "INTERVIEWING",
      query: "Google",
      sortBy: "appliedDate",
      sortOrder: "desc",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/applications");
    expect(calledUrl).toContain("status=INTERVIEWING");
    expect(calledUrl).toContain("query=Google");
    expect(calledUrl).toContain("sortBy=appliedDate");

    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((calledInit.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-valid-jwt-token");
    expect(result).toEqual([mockApp]);
  });

  it("getApplicationById should fetch a single application by id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockApp,
    } as Response);

    const result = await applicationsService.getApplicationById("app-uuid-1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/applications/app-uuid-1");
    expect(result).toEqual(mockApp);
  });

  it("createApplication should send POST to /applications with payload", async () => {
    const newPayload = {
      companyName: "Stripe",
      jobTitle: "Backend Infrastructure",
      status: "APPLIED" as const,
      location: "San Francisco, CA",
      employmentType: "REMOTE" as const,
      salaryRange: "$200k+",
      appliedDate: "2026-03-15",
      notes: "Referral submitted",
      matchScore: null,
    };

    const createdApp: JobApplication = {
      ...newPayload,
      id: "app-uuid-2",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => createdApp,
    } as Response);

    const result = await applicationsService.createApplication(newPayload);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/applications");
    expect(calledInit.method).toBe("POST");
    expect(JSON.parse(calledInit.body as string)).toEqual(newPayload);
    expect(result).toEqual(createdApp);
  });

  it("updateApplication should send PUT to /applications/:id with update payload", async () => {
    const updatePayload = {
      jobTitle: "Principal Engineer",
      status: "OFFER" as const,
    };

    const updatedApp: JobApplication = {
      ...mockApp,
      ...updatePayload,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updatedApp,
    } as Response);

    const result = await applicationsService.updateApplication("app-uuid-1", updatePayload);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/applications/app-uuid-1");
    expect(calledInit.method).toBe("PUT");
    expect(JSON.parse(calledInit.body as string)).toEqual(updatePayload);
    expect(result.jobTitle).toBe("Principal Engineer");
  });

  it("updateStatus should send PATCH to /applications/:id/status", async () => {
    const updatedApp: JobApplication = {
      ...mockApp,
      status: "OFFER",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updatedApp,
    } as Response);

    const result = await applicationsService.updateStatus("app-uuid-1", "OFFER");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/applications/app-uuid-1/status");
    expect(calledInit.method).toBe("PATCH");
    expect(JSON.parse(calledInit.body as string)).toEqual({ status: "OFFER" });
    expect(result.status).toBe("OFFER");
  });

  it("deleteApplication should send DELETE to /applications/:id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    await applicationsService.deleteApplication("app-uuid-1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;

    expect(calledUrl).toContain("/applications/app-uuid-1");
    expect(calledInit.method).toBe("DELETE");
  });

  it("getDashboardStats should send GET to /applications/stats and return stats", async () => {
    const mockStats: ApplicationStats = {
      totalApplied: 4,
      interviewsScheduled: 2,
      offersReceived: 1,
      averageMatchScore: 88,
      weeklyGoalTarget: 5,
      weeklyGoalCompleted: 3,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockStats,
    } as Response);

    const result = await applicationsService.getDashboardStats();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/applications/stats");
    expect(result).toEqual(mockStats);
  });

  it("should propagate ApiError when backend returns error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        message: "JobApplication not found with id: 'invalid-id'",
        status: 404,
      }),
    } as Response);

    await expect(applicationsService.getApplicationById("invalid-id")).rejects.toMatchObject({
      statusCode: 404,
      message: "JobApplication not found with id: 'invalid-id'",
    });
  });

  describe("Status Consistency & Filtering", () => {
    it("getApplications with status REJECTED sends status=REJECTED and not ARCHIVED", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);

      await applicationsService.getApplications({ status: "REJECTED" });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("status=REJECTED");
      expect(calledUrl).not.toContain("ARCHIVED");
    });

    it("getApplications with status ALL omits status query parameter", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);

      await applicationsService.getApplications({ status: "ALL" });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain("status=");
    });

    it("updateStatus accepts and transmits all 6 valid backend ApplicationStatus values", async () => {
      const statuses: ApplicationStatus[] = [
        "SAVED",
        "APPLIED",
        "SCREENING",
        "INTERVIEWING",
        "OFFER",
        "REJECTED",
      ];

      for (const st of statuses) {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ...mockApp, status: st }),
        } as Response);

        const res = await applicationsService.updateStatus("app-123", st);
        expect(res.status).toBe(st);

        const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
        const init = lastCall[1] as RequestInit;
        expect(JSON.parse(init.body as string)).toEqual({ status: st });
        fetchSpy.mockRestore();
      }
    });

    it("trims whitespace from search queries and omits empty query params", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);

      await applicationsService.getApplications({ query: "   Netflix Backend   " });

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("query=Netflix+Backend");

      // Whitespace only query should be omitted
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);

      await applicationsService.getApplications({ query: "    " });
      const secondUrl = fetchSpy.mock.calls[1][0] as string;
      expect(secondUrl).not.toContain("query=");
    });
  });

  describe("Application Form Validation", () => {
    it("fails validation when companyName is missing or whitespace only", () => {
      const result = validateApplicationForm({
        companyName: "   ",
        jobTitle: "Senior Engineer",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.company).toBe("Company name is required");
    });

    it("fails validation when jobTitle is missing or whitespace only", () => {
      const result = validateApplicationForm({
        companyName: "Anthropic",
        jobTitle: "",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe("Job title is required");
    });

    it("validates job posting URLs correctly", () => {
      // Invalid URL string
      const invalidResult = validateApplicationForm({
        companyName: "Stripe",
        jobTitle: "Infrastructure Engineer",
        jobUrl: "not-a-valid-url",
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.jobUrl).toContain("Please enter a valid URL");

      // Non-HTTP/HTTPS protocol
      const nonHttpResult = validateApplicationForm({
        companyName: "Stripe",
        jobTitle: "Infrastructure Engineer",
        jobUrl: "ftp://example.com/job",
      });
      expect(nonHttpResult.isValid).toBe(false);
      expect(nonHttpResult.errors.jobUrl).toBe("Please enter a valid HTTP or HTTPS URL");

      // Valid HTTPS URL
      const validResult = validateApplicationForm({
        companyName: "Stripe",
        jobTitle: "Infrastructure Engineer",
        jobUrl: "https://stripe.com/jobs/12345",
      });
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors.jobUrl).toBeUndefined();
    });

    it("passes validation with required fields and empty optional fields", () => {
      const result = validateApplicationForm({
        companyName: "Google",
        jobTitle: "Software Engineer",
      });

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });
});
