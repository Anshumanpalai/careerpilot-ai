import { ApiError } from "@/types/api.types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const TOKEN_KEY = "careerpilot_auth_token";

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public setToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.warn("Storage access restricted:", e);
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Resolves target URL ensuring consistent pathing without duplicate /api or /api/v1 segments.
   */
  public buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const rawEndpoint = (endpoint || "").trim();
    const cleanEndpoint = rawEndpoint.startsWith("/") ? rawEndpoint : `/${rawEndpoint}`;
    const cleanBase = this.baseUrl.replace(/\/+$/, "");

    let resolvedPath: string;

    // Prevent duplicate /api or /api/v1 segments
    if (cleanEndpoint === cleanBase || cleanEndpoint.startsWith(`${cleanBase}/`)) {
      resolvedPath = cleanEndpoint;
    } else if (cleanBase.endsWith("/v1") && cleanEndpoint.startsWith("/api/v1/")) {
      resolvedPath = cleanEndpoint;
    } else if (cleanBase.endsWith("/v1") && cleanEndpoint.startsWith("/api/")) {
      resolvedPath = cleanEndpoint.replace(/^\/api\//, `${cleanBase}/`);
    } else if (cleanBase.endsWith("/api") && cleanEndpoint.startsWith("/api/")) {
      resolvedPath = cleanEndpoint;
    } else {
      resolvedPath = `${cleanBase}${cleanEndpoint}`;
    }

    let url: URL;
    if (/^https?:\/\//i.test(cleanBase)) {
      const baseObj = new URL(cleanBase);
      const combinedPath = resolvedPath.startsWith(baseObj.pathname)
        ? resolvedPath
        : `${baseObj.pathname.replace(/\/+$/, "")}${cleanEndpoint}`;
      url = new URL(combinedPath, baseObj.origin);
    } else {
      url = new URL(resolvedPath, window.location.origin);
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeoutMs, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const token = this.getToken();

    const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      "Accept": "application/json",
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const externalSignal = fetchOptions.signal;

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort(externalSignal.reason);
      } else {
        externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
      }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = (await response.json()) as Record<string, unknown>;
        } catch {
          errorData = { message: response.statusText || `Request failed with code ${response.status}` };
        }

        const apiError = new ApiError(
          (errorData.message as string) || (typeof errorData === "string" ? errorData : `HTTP ${response.status} Error`),
          response.status,
          (errorData.fieldErrors || errorData.validationErrors) as Record<string, string> | undefined,
          errorData.details as string | undefined
        );

        if (response.status === 401) {
          // Token expired or invalid during an authenticated request
          if (!endpoint.includes("/auth/login")) {
            this.setToken(null);
            window.dispatchEvent(new CustomEvent("careerpilot:unauthorized"));
          }
        }

        throw apiError;
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: unknown) {
      if ((err as ApiError).statusCode !== undefined) {
        throw err;
      }
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("timed out"))) {
        throw new ApiError(
          "Request timed out. The server or AI service took longer than expected to respond. Please try again.",
          408
        );
      }
      // Network error or backend not yet reached
      const networkError = new ApiError(
        err instanceof Error ? err.message : "Failed to communicate with API server",
        0
      );
      throw networkError;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  public uploadMultipart<T>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
    });
  }

  public async downloadBlob(endpoint: string): Promise<{ blob: Blob; filename?: string }> {
    const url = this.buildUrl(endpoint);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      let errorMsg = `Download failed with code ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.message) errorMsg = errJson.message;
      } catch {}
      throw new Error(errorMsg);
    }

    const disposition = response.headers.get("Content-Disposition");
    let filename: string | undefined;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    const blob = await response.blob();
    return { blob, filename };
  }

  public getHealth(): Promise<{ status: string; app?: string; version?: string; timestamp?: string }> {
    return this.get<{ status: string; app?: string; version?: string; timestamp?: string }>("/health");
  }
}

export const apiClient = new ApiClient(BASE_URL);
