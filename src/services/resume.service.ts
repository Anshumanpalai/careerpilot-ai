import { apiClient } from "@/lib/api-client";
import { ResumeMetric } from "@/types/applications.types";
import {
  ResumeAnalysis,
  ResumeImprovementRequest,
  ResumeImprovementResponse,
  ResumeMatchResponse,
  ResumeRecord,
} from "@/types/resume.types";
import { SAMPLE_RESUME_METRICS } from "@/sample-data/applications.mock";

class ResumeService {
  public async uploadResume(file: File): Promise<ResumeRecord> {
    const formData = new FormData();
    formData.append("file", file);
    return await apiClient.uploadMultipart<ResumeRecord>("/resumes", formData);
  }

  public async listResumes(): Promise<ResumeRecord[]> {
    return await apiClient.get<ResumeRecord[]>("/resumes");
  }

  public async getResume(id: string): Promise<ResumeRecord> {
    return await apiClient.get<ResumeRecord>(`/resumes/${id}`);
  }

  public async downloadResume(id: string, originalFilename?: string): Promise<void> {
    const { blob, filename } = await apiClient.downloadBlob(`/resumes/${id}/download`);
    const resolvedFilename = originalFilename || filename || "resume_download.pdf";

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = resolvedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }

  public async deleteResume(id: string): Promise<void> {
    await apiClient.delete<void>(`/resumes/${id}`);
  }

  public async parseResume(id: string): Promise<ResumeAnalysis> {
    return await apiClient.post<ResumeAnalysis>(`/resumes/${id}/parse`);
  }

  public async getResumeAnalysis(id: string): Promise<ResumeAnalysis> {
    return await apiClient.get<ResumeAnalysis>(`/resumes/${id}/analysis`);
  }

  public async matchResume(resumeId: string, jobDescription: string): Promise<ResumeMatchResponse> {
    return await apiClient.post<ResumeMatchResponse>(`/resumes/${resumeId}/match`, { jobDescription });
  }

  public async improveResume(
    resumeId: string,
    request: ResumeImprovementRequest
  ): Promise<ResumeImprovementResponse> {
    return await apiClient.post<ResumeImprovementResponse>(`/resumes/${resumeId}/improve`, request);
  }

  public async getLatestImprovement(resumeId: string): Promise<ResumeImprovementResponse | null> {
    try {
      return await apiClient.get<ResumeImprovementResponse>(`/resumes/${resumeId}/improvements/latest`);
    } catch {
      return null;
    }
  }

  public async getResumeMetrics(): Promise<ResumeMetric> {
    try {
      return await apiClient.get<ResumeMetric>("/resume/analytics");
    } catch {
      return SAMPLE_RESUME_METRICS;
    }
  }

  public async analyzeResumeSnippet(
    snippet: string,
    targetRole: string
  ): Promise<{ score: number; suggestions: string[] }> {
    try {
      return await apiClient.post("/resume/analyze", { snippet, targetRole });
    } catch {
      return {
        score: Math.min(95, Math.max(65, 75 + Math.floor(snippet.length / 50))),
        suggestions: [
          "Incorporate quantifiable business impact (e.g. revenue, latency % or user adoption).",
          `Ensure alignment with core keywords for ${targetRole}.`,
          "Utilize active power verbs at the start of each bullet point.",
        ],
      };
    }
  }
}

export const resumeService = new ResumeService();

/**
 * Safely formats any API error response into an actionable, user-friendly message
 * for HTTP 400, 401, 403, 404, and 500 status codes without exposing stack traces or secrets.
 */
export function formatMatchErrorMessage(err: unknown): string {
  if (!err) {
    return "Failed to analyze resume against job description.";
  }

  const apiErr = (typeof err === "object" && err !== null ? err : {}) as {
    statusCode?: number;
    status?: number;
    message?: string;
    fieldErrors?: Record<string, string>;
    validationErrors?: Record<string, string>;
    details?: string;
    response?: {
      status?: number;
      data?: {
        message?: string;
        fieldErrors?: Record<string, string>;
        validationErrors?: Record<string, string>;
      };
    };
  };

  const status =
    apiErr.statusCode ??
    apiErr.status ??
    apiErr.response?.status;

  const fieldErrors =
    apiErr.fieldErrors ||
    apiErr.validationErrors ||
    apiErr.response?.data?.fieldErrors ||
    apiErr.response?.data?.validationErrors;

  const rawMessage =
    typeof apiErr.message === "string"
      ? apiErr.message
      : typeof apiErr.response?.data?.message === "string"
      ? apiErr.response.data.message
      : err instanceof Error
      ? err.message
      : "";

  // Helper to sanitize message from stack traces, file paths, and package/exception names
  const sanitize = (msg: string): string => {
    if (!msg) return "";
    return msg
      .replace(/(?:org\.springframework|com\.careerpilot)[\w.$]+:?/g, "")
      .replace(/at\s+[\w.$/\\:]+/g, "")
      .replace(/[A-Za-z0-9_.-]+Exception:?/g, "")
      .trim();
  };

  const cleanMessage = sanitize(rawMessage);

  // HTTP 400: Bad Request & Validation Errors
  if (status === 400) {
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      return Object.values(fieldErrors).join(". ");
    }
    if (cleanMessage) {
      return cleanMessage;
    }
    return "Invalid request. Please ensure you have selected a parsed resume and provided a complete job description (at least 50 characters).";
  }

  // HTTP 401: Unauthorized
  if (status === 401) {
    return "Your session has expired or is unauthenticated. Please sign in again to analyze your resume.";
  }

  // HTTP 403: Forbidden
  if (status === 403) {
    if (cleanMessage && cleanMessage !== "Forbidden" && !cleanMessage.toLowerCase().includes("access is denied")) {
      return cleanMessage;
    }
    return "Access denied. You do not have permission to analyze this resume document.";
  }

  // HTTP 404: Not Found
  if (status === 404) {
    if (cleanMessage && cleanMessage !== "Not Found" && !cleanMessage.includes("HTTP 404")) {
      return cleanMessage;
    }
    return "The requested resume or matching endpoint was not found (HTTP 404). Please ensure the backend is running and the resume exists.";
  }

  // HTTP 500: Internal Server Error
  if (status === 500) {
    return "The server encountered an unexpected error while analyzing your resume. Please verify the backend service is up to date and try again.";
  }

  // HTTP 502, 503, 504: Gateway / Server Unavailable
  if (status && status >= 502 && status <= 504) {
    return "The backend service is temporarily unreachable. Please check that the Spring Boot server is running on port 8080 and try again.";
  }

  // Network / server connection failure (status 0 or network error string)
  if (
    status === 0 ||
    rawMessage.toLowerCase().includes("failed to fetch") ||
    rawMessage.toLowerCase().includes("networkerror") ||
    rawMessage.toLowerCase().includes("connection refused") ||
    rawMessage.toLowerCase().includes("econnrefused")
  ) {
    return "Unable to communicate with the server. Please check your network connection and ensure the backend is running on port 8080.";
  }

  // General safe fallback with sanitized clean message if available
  if (cleanMessage) {
    return cleanMessage;
  }

  return "Failed to analyze resume against job description.";
}

/**
 * Formats API errors specific to AI Resume Improvement requests (Phase 5),
 * specifically handling 429 rate limiting, 503 AI provider disabled/unconfigured,
 * 502 malformed AI responses, 400 validation/consent issues, and timeouts.
 */
export function formatImprovementErrorMessage(err: unknown): string {
  if (!err) {
    return "Failed to generate AI resume improvements.";
  }

  const apiErr = (typeof err === "object" && err !== null ? err : {}) as {
    statusCode?: number;
    status?: number;
    message?: string;
    fieldErrors?: Record<string, string>;
    validationErrors?: Record<string, string>;
    details?: string;
    response?: {
      status?: number;
      data?: {
        message?: string;
        fieldErrors?: Record<string, string>;
        validationErrors?: Record<string, string>;
      };
    };
  };

  const status =
    apiErr.statusCode ??
    apiErr.status ??
    apiErr.response?.status;

  const fieldErrors =
    apiErr.fieldErrors ||
    apiErr.validationErrors ||
    apiErr.response?.data?.fieldErrors ||
    apiErr.response?.data?.validationErrors;

  const rawMessage =
    typeof apiErr.message === "string"
      ? apiErr.message
      : typeof apiErr.response?.data?.message === "string"
      ? apiErr.response.data.message
      : err instanceof Error
      ? err.message
      : "";

  const sanitize = (msg: string): string => {
    if (!msg) return "";
    return msg
      .replace(/(?:org\.springframework|com\.careerpilot)[\w.$]+:?/g, "")
      .replace(/at\s+[\w.$/\\:]+/g, "")
      .replace(/[A-Za-z0-9_.-]+Exception:?/g, "")
      .trim();
  };

  const cleanMessage = sanitize(rawMessage);

  // HTTP 429: Rate limit exceeded
  if (status === 429) {
    return cleanMessage || "Rate limit reached. You can make at most 5 AI resume improvement requests per minute. Please wait a moment and try again.";
  }

  // HTTP 503: AI provider disabled or unconfigured
  if (status === 503) {
    if (cleanMessage) return cleanMessage;
    return "The AI Resume Improvement service is currently disabled or unconfigured on the server (AI_ENABLED=false). Local parsing and ATS keyword matching remain fully available.";
  }

  // HTTP 502: AI Provider or Bad Gateway error
  if (status === 502) {
    return cleanMessage || "The AI provider returned a malformed response or encountered an upstream gateway error. Please try again in a few moments.";
  }

  // HTTP 400: Validation or Consent missing
  if (status === 400) {
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      return Object.values(fieldErrors).join(". ");
    }
    if (cleanMessage) return cleanMessage;
    return "Invalid request. Please verify that you have provided explicit AI processing consent and a valid job description.";
  }

  // HTTP 401: Unauthorized
  if (status === 401) {
    return "Your session has expired. Please log in again to generate AI recommendations.";
  }

  // HTTP 403: Forbidden
  if (status === 403) {
    return "Access denied. You do not have permission to modify or improve this resume.";
  }

  // HTTP 404: Not Found
  if (status === 404) {
    return "The specified resume was not found. Please select an existing parsed resume.";
  }

  // Network / server connection failure
  if (
    status === 0 ||
    rawMessage.toLowerCase().includes("failed to fetch") ||
    rawMessage.toLowerCase().includes("networkerror") ||
    rawMessage.toLowerCase().includes("connection refused")
  ) {
    return "Unable to connect to the backend server. Please verify that the Spring Boot server is running on port 8080.";
  }

  if (cleanMessage) {
    return cleanMessage;
  }

  return "Failed to generate AI resume improvements. Please try again.";
}

