import { applicationsService } from "@/services/applications.service";
import { resumeService } from "@/services/resume.service";
import { ApplicationStatus, JobApplication } from "@/types/applications.types";
import { ResumeRecord } from "@/types/resume.types";

export interface SearchResultItem {
  id: string;
  type: "APPLICATION" | "RESUME";
  title: string;
  subtitle: string;
  statusBadge?: {
    label: string;
    variant: "default" | "secondary" | "success" | "purple" | "info" | "destructive";
  };
  details?: string;
  url: string;
}

export interface SearchResultsGroup {
  applications: SearchResultItem[];
  resumes: SearchResultItem[];
  totalCount: number;
}

export class SearchService {
  public static mapStatusBadge(status: ApplicationStatus): {
    label: string;
    variant: "default" | "secondary" | "success" | "purple" | "info" | "destructive";
  } {
    switch (status) {
      case "OFFER":
        return { label: "Offer", variant: "success" };
      case "INTERVIEWING":
        return { label: "Interviewing", variant: "purple" };
      case "SCREENING":
        return { label: "Screening", variant: "info" };
      case "APPLIED":
        return { label: "Applied", variant: "default" };
      case "SAVED":
        return { label: "Saved", variant: "secondary" };
      case "REJECTED":
        return { label: "Rejected", variant: "destructive" };
    }
  }

  public async search(
    query: string,
    options?: { signal?: AbortSignal }
  ): Promise<SearchResultsGroup> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        applications: [],
        resumes: [],
        totalCount: 0,
      };
    }

    const lowerQuery = trimmed.toLowerCase();

    // Query both endpoints in parallel using the authenticated user's credentials
    const [applications, resumes] = await Promise.all([
      applicationsService.getApplications({ query: trimmed }, options),
      resumeService.listResumes(options),
    ]);

    const mappedApplications: SearchResultItem[] = (applications || []).map(
      (app: JobApplication) => ({
        id: app.id,
        type: "APPLICATION",
        title: `${app.companyName} — ${app.jobTitle}`,
        subtitle: `${app.location || "Remote"} • Applied: ${app.appliedDate}`,
        statusBadge: SearchService.mapStatusBadge(app.status),
        details: app.notes || (app.salaryRange ? `Target: ${app.salaryRange}` : undefined),
        url: `/dashboard/applications?query=${encodeURIComponent(app.companyName)}`,
      })
    );

    const matchingResumes: SearchResultItem[] = (resumes || [])
      .filter((r: ResumeRecord) => {
        return r.originalFilename.toLowerCase().includes(lowerQuery);
      })
      .map((r: ResumeRecord) => {
        const sizeKb = (r.fileSize / 1024).toFixed(1);
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Uploaded";
        const isParsed = r.status === "PARSED";
        return {
          id: r.id,
          type: "RESUME",
          title: r.originalFilename,
          subtitle: `${sizeKb} KB • Uploaded: ${dateStr}`,
          statusBadge: {
            label: isParsed ? "Parsed" : "Uploaded",
            variant: isParsed ? "success" : "secondary",
          },
          details: `Status: ${r.status}`,
          url: "/dashboard/resume",
        };
      });

    return {
      applications: mappedApplications,
      resumes: matchingResumes,
      totalCount: mappedApplications.length + matchingResumes.length,
    };
  }
}

export const searchService = new SearchService();

