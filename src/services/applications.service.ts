import { apiClient } from "@/lib/api-client";
import {
  ApplicationFilter,
  ApplicationStats,
  ApplicationStatus,
  JobApplication,
} from "@/types/applications.types";

export type CreateApplicationPayload = Omit<JobApplication, "id" | "createdAt" | "updatedAt">;
export type UpdateApplicationPayload = Partial<CreateApplicationPayload>;

class ApplicationsService {
  public async getApplications(
    filter?: ApplicationFilter,
    options?: { signal?: AbortSignal }
  ): Promise<JobApplication[]> {
    return await apiClient.get<JobApplication[]>("/applications", {
      signal: options?.signal,
      params: {
        query: filter?.query && filter.query.trim() ? filter.query.trim() : undefined,
        status: filter?.status && filter.status !== "ALL" ? filter.status : undefined,
        sortBy: filter?.sortBy,
        sortOrder: filter?.sortOrder,
      },
    });
  }

  public async getApplicationById(id: string): Promise<JobApplication> {
    return await apiClient.get<JobApplication>(`/applications/${id}`);
  }

  public async createApplication(payload: CreateApplicationPayload): Promise<JobApplication> {
    return await apiClient.post<JobApplication>("/applications", payload);
  }

  public async updateApplication(id: string, payload: UpdateApplicationPayload): Promise<JobApplication> {
    return await apiClient.put<JobApplication>(`/applications/${id}`, payload);
  }

  public async updateStatus(id: string, status: ApplicationStatus): Promise<JobApplication> {
    return await apiClient.patch<JobApplication>(`/applications/${id}/status`, { status });
  }

  public async deleteApplication(id: string): Promise<void> {
    return await apiClient.delete<void>(`/applications/${id}`);
  }

  public async getDashboardStats(): Promise<ApplicationStats> {
    return await apiClient.get<ApplicationStats>("/applications/stats");
  }
}

export const applicationsService = new ApplicationsService();
