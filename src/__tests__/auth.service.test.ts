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

const eventListeners: Record<string, ((event: CustomEvent) => void)[]> = {};

if (typeof window === "undefined") {
  globalThis.window = {
    location: { origin: "http://localhost:5174" } as Location,
    dispatchEvent: (ev: CustomEvent) => {
      const listeners = eventListeners[ev.type] || [];
      listeners.forEach((fn) => fn(ev));
      return true;
    },
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(listener as (event: CustomEvent) => void);
    },
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      if (eventListeners[type]) {
        eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
      }
    },
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

import { apiClient } from "@/lib/api-client";
import { authService } from "@/services/auth.service";
import { AuthResponse, UserProfile } from "@/types/auth.types";

describe("Frontend Authentication Service & Client", () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.setToken(null);
    vi.restoreAllMocks();
  });

  const mockUserProfile: UserProfile = {
    id: "usr_12345",
    email: "test.user@careerpilot.io",
    fullName: "Test User",
    role: "JOB_SEEKER",
    targetRole: "Staff Software Engineer",
    createdAt: "2026-10-27T00:00:00Z",
  };

  const mockAuthResponse: AuthResponse = {
    token: "real_jwt_token_sample_header.payload.signature",
    user: mockUserProfile,
  };

  describe("authService.login", () => {
    it("successfully logs in, saves JWT token in storage, and returns user profile", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      } as Response);

      const result = await authService.login({
        email: "  test.user@careerpilot.io  ",
        password: "ValidPassword123!",
      });

      expect(result).toEqual(mockAuthResponse);
      expect(apiClient.getToken()).toBe(mockAuthResponse.token);
      expect(authService.isAuthenticated()).toBe(true);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestUrl = fetchCall[0].toString();
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestUrl).toContain("/api/v1/auth/login");
      expect(requestBody.email).toBe("test.user@careerpilot.io");
      expect(requestBody.password).toBe("ValidPassword123!");
    });

    it("rejects login on invalid credentials (HTTP 401) without setting token", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ message: "Invalid email or password." }),
      } as Response);

      await expect(
        authService.login({
          email: "wrong@careerpilot.io",
          password: "BadPassword!",
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password.",
      });

      expect(apiClient.getToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe("authService.register", () => {
    it("successfully registers, saves JWT token, and returns new user", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockAuthResponse,
      } as Response);

      const result = await authService.register({
        fullName: "  Test User  ",
        email: "  test.user@careerpilot.io  ",
        password: "ValidPassword123!",
        targetRole: "  Staff Software Engineer  ",
        agreeToTerms: true,
      });

      expect(result).toEqual(mockAuthResponse);
      expect(apiClient.getToken()).toBe(mockAuthResponse.token);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestUrl = fetchCall[0].toString();
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestUrl).toContain("/api/v1/auth/register");
      expect(requestBody.fullName).toBe("Test User");
      expect(requestBody.email).toBe("test.user@careerpilot.io");
      expect(requestBody.targetRole).toBe("Staff Software Engineer");
    });

    it("rejects duplicate registration with HTTP 409 Conflict", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: "Conflict",
        json: async () => ({ message: "User already exists with email: 'test.user@careerpilot.io'" }),
      } as Response);

      await expect(
        authService.register({
          fullName: "Test User",
          email: "test.user@careerpilot.io",
          password: "ValidPassword123!",
          agreeToTerms: true,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "User already exists with email: 'test.user@careerpilot.io'",
      });

      expect(apiClient.getToken()).toBeNull();
    });
  });

  describe("authService.getCurrentUser (Session Restoration)", () => {
    it("fetches user profile with Bearer token attached", async () => {
      apiClient.setToken("valid_active_token");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUserProfile,
      } as Response);

      const user = await authService.getCurrentUser();

      expect(user).toEqual(mockUserProfile);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestUrl = fetchCall[0].toString();
      const headers = fetchCall[1]?.headers as Record<string, string>;

      expect(requestUrl).toContain("/api/v1/auth/me");
      expect(headers["Authorization"]).toBe("Bearer valid_active_token");
    });

    it("clears token and dispatches unauthorized event when token is expired (HTTP 401)", async () => {
      apiClient.setToken("expired_token");

      let unauthorizedDispatched = false;
      const handler = () => {
        unauthorizedDispatched = true;
      };
      window.addEventListener("careerpilot:unauthorized", handler);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ message: "Full authentication is required." }),
      } as Response);

      await expect(authService.getCurrentUser()).rejects.toMatchObject({
        statusCode: 401,
      });

      expect(apiClient.getToken()).toBeNull();
      expect(unauthorizedDispatched).toBe(true);

      window.removeEventListener("careerpilot:unauthorized", handler);
    });
  });

  describe("authService.logout", () => {
    it("removes token from storage and marks user unauthenticated", () => {
      apiClient.setToken("session_token_to_clear");
      expect(apiClient.getToken()).toBe("session_token_to_clear");

      authService.logout();

      expect(apiClient.getToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe("apiClient.buildUrl path consistency", () => {
    it("prevents duplicate /api or /api/v1 path segments", () => {
      expect(apiClient.buildUrl("/health")).toContain("/api/v1/health");
      expect(apiClient.buildUrl("/api/v1/health")).toContain("/api/v1/health");
      expect(apiClient.buildUrl("/api/health")).toContain("/api/v1/health");
      expect(apiClient.buildUrl("/auth/login")).toContain("/api/v1/auth/login");
      expect(apiClient.buildUrl("applications")).toContain("/api/v1/applications");

      // Verify no duplicate segments exist
      expect(apiClient.buildUrl("/api/v1/health")).not.toContain("/api/v1/api/v1");
      expect(apiClient.buildUrl("/api/health")).not.toContain("/api/api");
    });
  });
});
