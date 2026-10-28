import { apiClient } from "@/lib/api-client";
import { AuthResponse, LoginCredentials, RegisterPayload, UserProfile } from "@/types/auth.types";

class AuthService {
  /**
   * Authenticates user via Spring Boot backend POST /api/v1/auth/login.
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email: credentials.email.trim(),
      password: credentials.password,
    });
    apiClient.setToken(response.token);
    return response;
  }

  /**
   * Registers a new user via Spring Boot backend POST /api/v1/auth/register.
   */
  public async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", {
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      password: payload.password,
      targetRole: payload.targetRole?.trim() || undefined,
    });
    apiClient.setToken(response.token);
    return response;
  }

  /**
   * Fetches current authenticated user session from GET /api/v1/auth/me.
   */
  public async getCurrentUser(): Promise<UserProfile> {
    return await apiClient.get<UserProfile>("/auth/me");
  }

  /**
   * Clears authentication token.
   */
  public logout(): void {
    apiClient.setToken(null);
  }

  public isAuthenticated(): boolean {
    return !!apiClient.getToken();
  }
}

export const authService = new AuthService();
