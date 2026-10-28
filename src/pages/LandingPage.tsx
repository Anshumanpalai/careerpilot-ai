import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  ArrowRight,
  Target,
  FileCheck2,
  TrendingUp,
  BrainCircuit,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const { isAuthenticated, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  const handleDemoAccess = async () => {
    await quickDemoLogin();
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 lg:pt-24">
        {/* Subtle background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-sky-500/10 blur-[120px] pointer-events-none -z-10" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/40 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
              <span>Next-Gen Career Copilot for Tech Professionals</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.12]">
              Land Your Dream Role with{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Algorithmic Precision
              </span>
            </h1>

            <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto leading-relaxed">
              CareerPilot AI optimizes your resume for ATS filters, tracks your application pipeline in real time, and prepares tailored interview answers designed to get offers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              {isAuthenticated ? (
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button variant="brand" size="lg" className="w-full sm:w-auto gap-2">
                    <span>Enter Mission Control</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="w-full sm:w-auto">
                    <Button variant="brand" size="lg" className="w-full sm:w-auto gap-2 text-base">
                      <span>Start Free Pilot</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    onClick={handleDemoAccess}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 text-base border-border bg-card/80 hover:bg-accent"
                  >
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>Instant Demo Preview</span>
                  </Button>
                </>
              )}
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> ATS compatibility guarantee
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero data selling policy
              </span>
            </div>
          </div>

          {/* Interactive UI Dashboard Preview Graphic */}
          <div className="mt-14 relative mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card/70 p-3 shadow-2xl backdrop-blur-md">
            <div className="rounded-xl border border-border/60 bg-background/95 p-4 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">careerpilot.app/workspace/pipeline</span>
                </div>
                <Badge variant="success" className="gap-1 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Syncing Active
                </Badge>
              </div>

              {/* Sample Mini Cards inside preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <span className="text-xs text-muted-foreground font-medium">ATS Match Fit</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-bold text-foreground">94%</span>
                    <span className="text-xs font-semibold text-emerald-600">+18% vs baseline</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Stripe - Staff Platform Engineer</p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <span className="text-xs text-muted-foreground font-medium">Interview Pipeline</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-bold text-foreground">6 Active</span>
                    <span className="text-xs font-semibold text-indigo-600">2 Offers Pending</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">42% response rate (Top 5% tier)</p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <span className="text-xs text-muted-foreground font-medium">AI Suggestions Applied</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-bold text-foreground">37 Keywords</span>
                    <span className="text-xs font-semibold text-purple-600">High Impact</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Quantifiable metrics added to 4 roles</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics & Social Proof */}
      <section className="border-y border-border bg-muted/30 py-10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-foreground">3.8x</p>
              <p className="text-xs text-muted-foreground mt-1">Higher Recruiter Callback Rate</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">&lt; 48 hrs</p>
              <p className="text-xs text-muted-foreground mt-1">Average Time to First Screening</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">$32,000</p>
              <p className="text-xs text-muted-foreground mt-1">Average Salary Increase</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-foreground">15,000+</p>
              <p className="text-xs text-muted-foreground mt-1">Applications Co-Piloted</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <Badge variant="outline" className="border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              Complete Feature Suite
            </Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Engineered for the Modern Tech Job Hunt
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to replace messy spreadsheets, generic cover letters, and silent rejections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Real-Time ATS Parsing</CardTitle>
                <CardDescription>
                  Instant algorithmic breakdown of job descriptions against your resume. See keyword gaps before recruiters do.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
                  <Briefcase className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Kanban Application Pipeline</CardTitle>
                <CardDescription>
                  Visual tracking across Saved, Applied, Screening, Technical Interview, and Offer stages with reminders.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center mb-3">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Impact-Driven Bullet Rewriter</CardTitle>
                <CardDescription>
                  Turns bland task descriptions into quantified achievements using the Google X-Y-Z formula.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Salary & Compensation Insights</CardTitle>
                <CardDescription>
                  Know your leverage with verified total compensation bands, equity benchmarks, and counter-offer strategies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                  <Target className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Interview Question Predictor</CardTitle>
                <CardDescription>
                  Generates expected behavioral and architectural questions based on the target company and job level.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Enterprise Privacy First</CardTitle>
                <CardDescription>
                  Your resumes, notes, and salary queries are encrypted and never used for training third-party public models.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-border bg-card/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <Badge variant="outline" className="border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              Transparent Pricing
            </Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Invest in Your Next Career Leap
            </h2>
            <p className="text-sm text-muted-foreground">
              Simple plans that pay for themselves with a single interview conversion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg">Starter Pilot</CardTitle>
                <CardDescription>Essential tracking for active job seekers</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Up to 25 tracked applications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Basic ATS resume scans (5 / month)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Pipeline Kanban board</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </Card>

            {/* Pro Copilot Tier (Featured) */}
            <Card className="flex flex-col justify-between border-primary ring-2 ring-primary/20 shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground uppercase tracking-wider">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle className="text-lg">AI Pro Copilot</CardTitle>
                <CardDescription>Full intelligence suite for tech talent</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-foreground">$19</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Unlimited tracked applications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Unlimited AI resume tailoring & ATS scans</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Custom cover letters in 1 click</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Interview response simulator</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register">
                  <Button variant="brand" className="w-full shadow-md">Upgrade to Pro</Button>
                </Link>
              </div>
            </Card>

            {/* Executive / Accelerator Tier */}
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg">Executive Coach</CardTitle>
                <CardDescription>Tailored strategy for staff+ & managers</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-foreground">$49</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Everything in Pro Copilot</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>1-on-1 resume audit review</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Salary negotiation script generator</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Priority recruiter network access</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register">
                  <Button variant="outline" className="w-full">Join Executive</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Strip */}
      <section className="py-16 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white">
        <div className="container mx-auto max-w-7xl px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold sm:text-4xl max-w-xl mx-auto">
            Ready to Take Control of Your Career Trajectory?
          </h2>
          <p className="text-indigo-200 text-sm max-w-md mx-auto">
            Join thousands of software engineers, architects, and managers who landed top tier roles with CareerPilot.
          </p>
          <div className="pt-2">
            <Link to="/register">
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-white/90 font-bold px-8 shadow-xl">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
