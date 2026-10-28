import { describe, it, expect, beforeEach, vi } from "vitest";

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

describe("AuthContext Session Restoration & Token Flow", () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.setToken(null);
    vi.restoreAllMocks();
  });

  it("restores session when valid token exists in storage", async () => {
    apiClient.setToken("saved_jwt_token_123");

    vi.spyOn(authService, "getCurrentUser").mockResolvedValueOnce({
      id: "usr_restore_1",
      email: "alex@careerpilot.io",
      fullName: "Alex Mercer",
      role: "JOB_SEEKER",
      createdAt: "2026-10-27T00:00:00Z",
    });

    const user = await authService.getCurrentUser();
    expect(user.email).toBe("alex@careerpilot.io");
    expect(apiClient.getToken()).toBe("saved_jwt_token_123");
  });

  it("clears storage and marks session unauthenticated when token verification fails", async () => {
    apiClient.setToken("corrupted_or_expired_jwt");

    vi.spyOn(authService, "getCurrentUser").mockRejectedValueOnce({
      statusCode: 401,
      message: "Full authentication is required.",
    });

    await expect(authService.getCurrentUser()).rejects.toMatchObject({
      statusCode: 401,
    });

    authService.logout();
    expect(apiClient.getToken()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
