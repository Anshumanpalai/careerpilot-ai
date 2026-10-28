export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEWING"
  | "OFFER"
  | "REJECTED";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "REMOTE" | "HYBRID";

export interface JobApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  location?: string;
  employmentType: EmploymentType;
  salaryRange?: string;
  status: ApplicationStatus;
  appliedDate: string;
  nextStepDate?: string;
  matchScore?: number | null; // ATS score (nullable; do not invent AI scores)
  notes?: string;
  jobUrl?: string;
  contacts?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationStats {
  totalApplied: number;
  interviewsScheduled: number;
  offersReceived: number;
  averageMatchScore: number;
  weeklyGoalTarget: number;
  weeklyGoalCompleted: number;
}

export interface ResumeMetric {
  overallScore: number;
  keywordMatch: number;
  impactScore: number;
  atsReadability: number;
  topSkillsFound: string[];
  recommendedSkills: string[];
  recentCritiques: Array<{
    id: string;
    section: string;
    issue: string;
    suggestion: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export interface ApplicationFilter {
  query?: string;
  status?: ApplicationStatus | "ALL";
  sortBy?: "appliedDate" | "matchScore" | "companyName";
  sortOrder?: "asc" | "desc";
}
