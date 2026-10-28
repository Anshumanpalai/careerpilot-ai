import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Compass, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { DEMO_CREDENTIALS } from "@/sample-data/auth.mock";

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
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
      await login({ email, password });
      navigate(from, { replace: true });
    } catch {
      // Error state set in AuthContext and rendered via Alert
    }
  };

  const handleDemoFill = async () => {
    if (isLoading) return;
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setFieldErrors({});
    clearError();
    try {
      await login({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
      navigate(from, { replace: true });
    } catch {
      // Error handled in AuthContext and rendered via Alert
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-500/10 blur-[100px] pointer-events-none -z-10" />

      {/* Brand Header */}
      <Link to="/" className="flex items-center gap-2.5 mb-8 hover:opacity-90 transition-opacity">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
          <Compass className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold tracking-tight text-foreground">CareerPilot</span>
            <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
              AI
            </span>
          </div>
        </div>
      </Link>

      <Card className="w-full max-w-md shadow-xl border-border/80">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-center font-bold">Welcome back</CardTitle>
          <CardDescription className="text-center text-xs">
            Sign in to access your AI-powered career pipeline and ATS diagnostics
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" onClose={clearError} title="Authentication Error">
              {error}
            </Alert>
          )}

          {/* Prototype helper banner */}
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>Previewing without backend setup?</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoFill}
              className="h-7 text-xs border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 shrink-0"
            >
              1-Click Demo
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" required>
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                }}
                error={!!fieldErrors.email}
                startIcon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                disabled={isLoading}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive font-medium">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" required>
                  Password
                </Label>
                <a href="#forgot" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="current-password"
                disabled={isLoading}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive font-medium">{fieldErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="brand"
              className="w-full gap-2 mt-2"
              isLoading={isLoading}
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2 text-center text-xs text-muted-foreground border-t border-border">
          <p>
            Don't have an account yet?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Sign up for free
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Communication</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
