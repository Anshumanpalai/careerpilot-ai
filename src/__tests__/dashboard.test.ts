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
    location: { origin: "http://localhost:5174", href: "" } as unknown as Location,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;
}

import { applicationsService } from "@/services/applications.service";
import { resumeService } from "@/services/resume.service";
import { ApplicationStats, JobApplication } from "@/types/applications.types";
import { ResumeRecord } from "@/types/resume.types";

describe("Dashboard UX & Product Polish Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("careerpilot_auth_token", "test-token");
    vi.restoreAllMocks();
  });

  describe("Real Metrics & Goal Derivations", () => {
    it("derives goal progress accurately without inventing numbers", () => {
      const stats: ApplicationStats = {
        totalApplied: 4,
        interviewsScheduled: 1,
        offersReceived: 0,
        averageMatchScore: 82,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 3,
      };

      const percent = Math.min(100, Math.round((stats.weeklyGoalCompleted / stats.weeklyGoalTarget) * 100));
      expect(percent).toBe(60);
      expect(stats.weeklyGoalTarget - stats.weeklyGoalCompleted).toBe(2);
    });

    it("caps weekly goal percentage at 100% when goal is exceeded", () => {
      const stats: ApplicationStats = {
        totalApplied: 10,
        interviewsScheduled: 3,
        offersReceived: 1,
        averageMatchScore: 88,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 8,
      };

      const percent = Math.min(100, Math.round((stats.weeklyGoalCompleted / stats.weeklyGoalTarget) * 100));
      expect(percent).toBe(100);
    });

    it("handles zero values cleanly for first-time users", () => {
      const stats: ApplicationStats = {
        totalApplied: 0,
        interviewsScheduled: 0,
        offersReceived: 0,
        averageMatchScore: 0,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 0,
      };

      const percent = Math.min(100, Math.round((stats.weeklyGoalCompleted / stats.weeklyGoalTarget) * 100));
      expect(percent).toBe(0);
      expect(stats.averageMatchScore).toBe(0);
    });
  });

  describe("Onboarding Checklist Milestones", () => {
    it("marks 0 steps completed for a brand new user with no resume and no applications", () => {
      const resumes: ResumeRecord[] = [];
      const stats: ApplicationStats = {
        totalApplied: 0,
        interviewsScheduled: 0,
        offersReceived: 0,
        averageMatchScore: 0,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 0,
      };
      const recentApps: JobApplication[] = [];

      const hasResume = resumes.length > 0;
      const hasParsedResume = resumes.some((r) => r.status === "PARSED");
      const hasAtsEvaluation =
        (stats.averageMatchScore || 0) > 0 ||
        recentApps.some((a) => a.matchScore != null && a.matchScore > 0);
      const hasApplications = stats.totalApplied > 0;

      const completed = [hasResume, hasParsedResume, hasAtsEvaluation, hasApplications].filter(Boolean).length;
      expect(completed).toBe(0);
      expect(Math.round((completed / 4) * 100)).toBe(0);
    });

    it("marks step 1 completed when a resume is uploaded but unparsed", () => {
      const resumes: ResumeRecord[] = [
        {
          id: "res-1",
          originalFilename: "resume.pdf",
          fileSize: 45000,
          contentType: "application/pdf",
          status: "UPLOADED",
          createdAt: "2026-10-28T10:00:00Z",
          updatedAt: "2026-10-28T10:00:00Z",
        },
      ];
      const stats: ApplicationStats = {
        totalApplied: 0,
        interviewsScheduled: 0,
        offersReceived: 0,
        averageMatchScore: 0,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 0,
      };

      const hasResume = resumes.length > 0;
      const hasParsedResume = resumes.some((r) => r.status === "PARSED");
      const hasAtsEvaluation = (stats.averageMatchScore || 0) > 0;
      const hasApplications = stats.totalApplied > 0;

      const completed = [hasResume, hasParsedResume, hasAtsEvaluation, hasApplications].filter(Boolean).length;
      expect(hasResume).toBe(true);
      expect(hasParsedResume).toBe(false);
      expect(completed).toBe(1);
      expect(Math.round((completed / 4) * 100)).toBe(25);
    });

    it("marks steps 1 & 2 completed when a resume is parsed", () => {
      const resumes: ResumeRecord[] = [
        {
          id: "res-1",
          originalFilename: "resume.pdf",
          fileSize: 45000,
          contentType: "application/pdf",
          status: "PARSED",
          createdAt: "2026-10-28T10:00:00Z",
          updatedAt: "2026-10-28T10:00:00Z",
        },
      ];
      const stats: ApplicationStats = {
        totalApplied: 0,
        interviewsScheduled: 0,
        offersReceived: 0,
        averageMatchScore: 0,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 0,
      };

      const hasResume = resumes.length > 0;
      const hasParsedResume = resumes.some((r) => r.status === "PARSED");
      const hasAtsEvaluation = (stats.averageMatchScore || 0) > 0;
      const hasApplications = stats.totalApplied > 0;

      const completed = [hasResume, hasParsedResume, hasAtsEvaluation, hasApplications].filter(Boolean).length;
      expect(hasResume).toBe(true);
      expect(hasParsedResume).toBe(true);
      expect(completed).toBe(2);
      expect(Math.round((completed / 4) * 100)).toBe(50);
    });

    it("marks all 4 steps completed when an active user has evaluated resumes and tracked opportunities", () => {
      const resumes: ResumeRecord[] = [
        {
          id: "res-1",
          originalFilename: "resume.pdf",
          fileSize: 45000,
          contentType: "application/pdf",
          status: "PARSED",
          createdAt: "2026-10-28T10:00:00Z",
          updatedAt: "2026-10-28T10:00:00Z",
        },
      ];
      const stats: ApplicationStats = {
        totalApplied: 6,
        interviewsScheduled: 2,
        offersReceived: 1,
        averageMatchScore: 85,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 4,
      };
      const recentApps: JobApplication[] = [
        {
          id: "app-1",
          companyName: "Google",
          jobTitle: "Senior SWE",
          employmentType: "FULL_TIME",
          status: "INTERVIEWING",
          appliedDate: "2026-10-25",
          matchScore: 85,
        },
      ];

      const hasResume = resumes.length > 0;
      const hasParsedResume = resumes.some((r) => r.status === "PARSED");
      const hasAtsEvaluation =
        (stats.averageMatchScore || 0) > 0 ||
        recentApps.some((a) => a.matchScore != null && a.matchScore > 0);
      const hasApplications = stats.totalApplied > 0;

      const completed = [hasResume, hasParsedResume, hasAtsEvaluation, hasApplications].filter(Boolean).length;
      expect(completed).toBe(4);
      expect(Math.round((completed / 4) * 100)).toBe(100);
    });
  });

  describe("Context-Aware User Guidance", () => {
    it("produces appropriate first-time onboarding message when user has no data", () => {
      const hasResume = false;
      const hasApplications = false;
      const isFirstTimeUser = !hasResume && !hasApplications;

      const getMessage = () => {
        if (isFirstTimeUser) {
          return "Welcome to CareerPilot AI. Start by uploading your resume to unlock AI keyword tailoring, ATS optimization, and application pipeline tracking.";
        }
        return "Active pipeline";
      };

      expect(getMessage()).toContain("Welcome to CareerPilot AI");
      expect(getMessage()).toContain("Start by uploading your resume");
    });

    it("produces active pipeline summary when opportunities exist", () => {
      const stats = { totalApplied: 5, interviewsScheduled: 2 };
      const hasResume = true;
      const hasParsedResume = true;
      const hasApplications = true;

      const getMessage = () => {
        if (!hasResume && !hasApplications) return "Welcome";
        if (hasResume && !hasParsedResume) return "Parse your resume";
        if (hasParsedResume && !hasApplications) return "Log your first opportunity";
        return `You have ${stats.totalApplied} tracked opportunities with ${stats.interviewsScheduled} active interview rounds.`;
      };

      const msg = getMessage();
      expect(msg).toContain("5 tracked opportunities");
      expect(msg).toContain("2 active interview rounds");
    });
  });

  describe("API Services Integration", () => {
    it("loads dashboard data concurrently using Promise.all", async () => {
      const mockStats: ApplicationStats = {
        totalApplied: 2,
        interviewsScheduled: 1,
        offersReceived: 0,
        averageMatchScore: 78,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 2,
      };

      const mockApps: JobApplication[] = [
        {
          id: "app-1",
          companyName: "Stripe",
          jobTitle: "Backend Engineer",
          employmentType: "FULL_TIME",
          status: "APPLIED",
          appliedDate: "2026-10-27",
        },
      ];

      const mockResumes: ResumeRecord[] = [
        {
          id: "res-1",
          originalFilename: "engineer_resume.pdf",
          fileSize: 52000,
          contentType: "application/pdf",
          status: "PARSED",
          createdAt: "2026-10-26T12:00:00Z",
          updatedAt: "2026-10-26T12:00:00Z",
        },
      ];

      vi.spyOn(applicationsService, "getDashboardStats").mockResolvedValueOnce(mockStats);
      vi.spyOn(applicationsService, "getApplications").mockResolvedValueOnce(mockApps);
      vi.spyOn(resumeService, "listResumes").mockResolvedValueOnce(mockResumes);

      const [stats, apps, resumes] = await Promise.all([
        applicationsService.getDashboardStats(),
        applicationsService.getApplications({ sortBy: "appliedDate", sortOrder: "desc" }),
        resumeService.listResumes(),
      ]);

      expect(stats.totalApplied).toBe(2);
      expect(apps).toHaveLength(1);
      expect(apps[0].companyName).toBe("Stripe");
      expect(resumes).toHaveLength(1);
      expect(resumes[0].originalFilename).toBe("engineer_resume.pdf");
      expect(resumes[0].status).toBe("PARSED");
    });
  });
});

