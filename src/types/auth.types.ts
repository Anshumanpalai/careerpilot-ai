export type UserRole = "JOB_SEEKER" | "CAREER_COACH" | "ADMIN";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  targetRole?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  targetRole?: string;
  agreeToTerms?: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: UserProfile;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
