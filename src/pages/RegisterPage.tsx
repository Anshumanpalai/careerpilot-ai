import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Compass, User, Mail, Lock, Briefcase, Eye, EyeOff, ArrowRight } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState("Full Stack Software Engineer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: "None", color: "bg-muted" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 75, label: "Good", color: "bg-blue-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(password);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!agreeToTerms) {
      errors.terms = "You must agree to the terms to continue.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    clearError();
    if (!validate()) return;

    try {
      await register({
        fullName,
        email,
        password,
        targetRole,
        agreeToTerms,
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as { fieldErrors?: Record<string, string> };
      if (apiErr?.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...apiErr.fieldErrors }));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-indigo-500/10 blur-[110px] pointer-events-none -z-10" />

      {/* Brand Header */}
      <Link to="/" className="flex items-center gap-2.5 mb-8 hover:opacity-90 transition-opacity">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
          <Compass className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight text-foreground">CareerPilot</span>
          <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
            AI
          </span>
        </div>
      </Link>

      <Card className="w-full max-w-lg shadow-xl border-border/80">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-center font-bold">Create your career account</CardTitle>
          <CardDescription className="text-center text-xs">
            Start tracking applications, optimizing ATS resumes, and preparing for technical screens
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" onClose={clearError} title="Registration Error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" required>
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Jordan Hayes"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: undefined });
                  }}
                  error={!!fieldErrors.fullName}
                  startIcon={<User className="h-4 w-4" />}
                  disabled={isLoading}
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" required>
                  Work or Personal Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jordan@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  error={!!fieldErrors.email}
                  startIcon={<Mail className="h-4 w-4" />}
                  disabled={isLoading}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="targetRole">Target Career Role</Label>
              <Input
                id="targetRole"
                type="text"
                placeholder="e.g. Senior Frontend Engineer or Engineering Lead"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                startIcon={<Briefcase className="h-4 w-4" />}
                disabled={isLoading}
              />
              <p className="text-[11px] text-muted-foreground">
                CareerPilot tunes your keyword analytics and interview simulations to this role.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" required>
                  Password
                </Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 chars"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  error={!!fieldErrors.password}
                  startIcon={<Lock className="h-4 w-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="focus:outline-none hover:text-foreground text-muted-foreground"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  disabled={isLoading}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" required>
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                  }}
                  error={!!fieldErrors.confirmPassword}
                  startIcon={<Lock className="h-4 w-4" />}
                  disabled={isLoading}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Password strength meter */}
            {password && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span className="font-semibold text-foreground">{strength.label}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => {
                    setAgreeToTerms(e.target.checked);
                    if (fieldErrors.terms) setFieldErrors({ ...fieldErrors, terms: undefined });
                  }}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>
                  I agree to the{" "}
                  <a href="#terms" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and acknowledge the privacy policy.
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.terms}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="brand"
              className="w-full gap-2 mt-2"
              isLoading={isLoading}
            >
              <span>Create Account</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in instead
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
