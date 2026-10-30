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
  FileCheck2,
  BrainCircuit,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Download,
  GitBranch,
  ExternalLink,
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
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-sky-500/10 blur-[120px] pointer-events-none -z-10" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/40 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
              <span>Intelligent Career Copilot for Software Engineers & Tech Pros</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.12]">
              Navigate Your Tech Career with{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Algorithmic Precision
              </span>
            </h1>

            <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Parse your resume with Apache PDFBox heuristics, analyze keyword coverage against real job requirements, craft AI tailored recommendations, and track opportunities across all 6 pipeline stages.
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
                      <span>Start Free Beta</span>
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
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 100% Free during Open Beta
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Explicit AI consent controls
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Isolated user data storage
              </span>
            </div>
          </div>

          {/* Realistic Dashboard Preview Graphic */}
          <div className="mt-14 relative mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card/70 p-3 shadow-2xl backdrop-blur-md">
            <div className="rounded-xl border border-border/60 bg-background/95 p-4 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">careerpilot.app/dashboard/pipeline</span>
                </div>
                <Badge variant="outline" className="gap-1 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-3 w-3" />
                  Gemini 3.8 Flash AI
                </Badge>
              </div>

              {/* Realistic Pipeline Cards Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground">Stripe</span>
                    <Badge variant="purple" className="text-[10px]">Interviewing</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Staff Infrastructure Engineer</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground border-t border-border/50">
                    <span>Applied: Oct 24</span>
                    <span className="font-semibold text-foreground">92% ATS Match</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground">OpenAI</span>
                    <Badge variant="info" className="text-[10px]">Screening</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Full Stack Systems Engineer</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground border-t border-border/50">
                    <span>Applied: Oct 26</span>
                    <span className="font-semibold text-foreground">88% ATS Match</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground">Databricks</span>
                    <Badge variant="success" className="text-[10px]">Offer</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Senior Backend Engineer</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground border-t border-border/50">
                    <span>Applied: Oct 18</span>
                    <span className="font-semibold text-foreground">95% ATS Match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Genuine Capabilities Bar (No fabricated numbers) */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">6 Stages</p>
              <p className="text-xs text-muted-foreground mt-1">Saved, Applied, Screening, Interviewing, Offer, Rejected</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">PDFBox & POI</p>
              <p className="text-xs text-muted-foreground mt-1">Heuristic Structure & Text Parsing for PDF & DOCX</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">Gemini 3.8 Flash</p>
              <p className="text-xs text-muted-foreground mt-1">Anti-Hallucination Guardrails & Consent Safeguards</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">PDF Version Export</p>
              <p className="text-xs text-muted-foreground mt-1">Side-by-Side Version Diff & Publication-Ready PDF</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Workflow Section */}
      <section id="how-it-works" className="py-20 bg-background border-b border-border">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <Badge variant="outline" className="border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              Clear 4-Step Workflow
            </Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              From Document Upload to Interview Offer
            </h2>
            <p className="text-sm text-muted-foreground">
              A transparent, privacy-first workflow designed to eliminate guesswork and track real progress.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-bold text-sm text-foreground">Upload Document</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload your master resume in PDF or DOCX format. Files are encrypted and stored in isolated storage per user.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="font-bold text-sm text-foreground">Parse & Inspect</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Extract structural sections and plain text using Apache PDFBox heuristics. Verify experience, skills, and education blocks.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="font-bold text-sm text-foreground">Scan & Tailor with AI</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Run ATS keyword gap analysis against target job descriptions and request tailored improvements with explicit consent.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                4
              </div>
              <h3 className="font-bold text-sm text-foreground">Track Pipeline & Offers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Organize company applications, record recruiter notes, set salary targets, and export version-tailored PDFs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="py-20 bg-card/30">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <Badge variant="outline" className="border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              Core Platform Capabilities
            </Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Engineered for Real Job Search Workflows
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything in CareerPilot AI is connected directly to working backend services and persisted data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">ATS Keyword Scanner</CardTitle>
                <CardDescription>
                  Algorithmic comparison of job requirements against parsed resume content. See matching skills and critical qualification gaps.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <Briefcase className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">6-Stage Application Pipeline</CardTitle>
                <CardDescription>
                  Track opportunities through Saved, Applied, Screening, Interviewing, Offer, and Rejected stages with date logging and notes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">AI Tailoring Suggestions</CardTitle>
                <CardDescription>
                  Generates targeted bullet rewrites and professional summaries using Gemini 3.8 Flash with strict anti-hallucination safeguards.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <GitBranch className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Resume Version Studio</CardTitle>
                <CardDescription>
                  Create and manage specialized versions for different roles. Compare versions side-by-side with word-level diffing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Download className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Direct PDF Compilation</CardTitle>
                <CardDescription>
                  Export customized resume versions directly to cleanly formatted, ATS-friendly PDF documents ready to send to recruiters.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Enterprise Privacy & Consent</CardTitle>
                <CardDescription>
                  User data is isolated by user ID in PostgreSQL. AI transmission requires explicit per-request consent with zero training on your data.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* AI Resume Engine Spotlight */}
      <section id="resume-engine" className="py-20 bg-background border-t border-border">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="outline" className="border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                AI Resume Intelligence
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Target Roles with Tailored AI Recommendations
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CareerPilot AI connects real document parsing heuristics with Google Gemini 3.8 Flash. Paste a job description to instantly detect missing keywords, evaluate match scores, and apply AI suggestions directly into new resume drafts.
              </p>

              <div className="space-y-3 text-xs text-foreground/90">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Explicit Consent Gate:</strong> No resume or job data is sent to external AI providers without your active consent checkbox.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Fact Preservation Safeguards:</strong> Prompts enforce strict adherence to real career history, preventing fabricated skills or credentials.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Side-by-Side Versioning:</strong> Review diffs, accept suggestions incrementally, and export directly to PDF.</span>
                </div>
              </div>

              <div className="pt-2">
                {isAuthenticated ? (
                  <Link to="/dashboard/resume">
                    <Button variant="brand" className="gap-2">
                      <span>Open AI Resume Studio</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/register">
                    <Button variant="brand" className="gap-2">
                      <span>Try AI Resume Studio Free</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">ATS Keyword Coverage Analysis</span>
                </div>
                <Badge variant="success" className="text-[11px]">88% Match</Badge>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Found Technical Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Java 21", "Spring Boot", "PostgreSQL", "Docker", "RESTful APIs", "Microservices"].map((skill) => (
                    <span key={skill} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-500/20">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Missing Job Requirements:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Kubernetes", "Kafka", "Distributed Tracing"].map((skill) => (
                    <span key={skill} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-medium border border-amber-500/20">
                      + {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 border border-border text-xs text-muted-foreground">
                <p className="font-semibold text-foreground text-[11px] mb-1">Tailored AI Suggestion:</p>
                <p className="italic">"Architected and deployed event-driven data streaming microservices using Spring Boot and Apache Kafka, reducing message latency by 35% across 12 services."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Honest Pricing & Roadmap Section */}
      <section id="pricing" className="py-20 border-t border-border bg-card/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <Badge variant="outline" className="border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              Open Beta & Roadmap
            </Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Transparent Access & Honest Product Tiers
            </h2>
            <p className="text-sm text-muted-foreground">
              CareerPilot AI is in active development. All core features are free during our Open Beta — no paywalls or fake upgrade charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Beta Tier (Active) */}
            <Card className="flex flex-col justify-between border-primary ring-2 ring-primary/20 shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground uppercase tracking-wider">
                Available Now
              </div>
              <CardHeader>
                <CardTitle className="text-lg">Open Beta Access</CardTitle>
                <CardDescription>Full feature suite for job seekers & engineers</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground"> / month (Free in Beta)</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Full 6-stage application tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Resume upload & PDFBox text extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>ATS keyword scanner & match scores</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Gemini 3.8 Flash AI tailoring suggestions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Resume versioning & direct PDF export</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button variant="brand" className="w-full">Go to Mission Control</Button>
                  </Link>
                ) : (
                  <Link to="/register">
                    <Button variant="brand" className="w-full">Create Free Account</Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Cloud Pro Tier (Roadmap) */}
            <Card className="flex flex-col justify-between opacity-95">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Cloud Pro</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">Roadmap</Badge>
                </div>
                <CardDescription>Planned features currently under active development</CardDescription>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-muted-foreground">In Development</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Will remain free for early beta users</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/60" />
                  <span>Automated job application browser extension</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/60" />
                  <span>Google Calendar interview schedule sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/60" />
                  <span>Multi-model LLM provider switcher</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/60" />
                  <span>Automated recruiter follow-up reminders</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link to="/register">
                  <Button variant="outline" className="w-full">Join Early Access</Button>
                </Link>
              </div>
            </Card>

            {/* Self-Hosted / Developer Core */}
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Self-Hosted Core</CardTitle>
                  <Badge variant="outline" className="text-[10px]">Open Source</Badge>
                </div>
                <CardDescription>Run CareerPilot locally on your own infrastructure</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground"> / Apache 2.0 / MIT</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Spring Boot 3.4 & React 19 codebase</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Bring your own Gemini or OpenAI API key</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>PostgreSQL schema & Flyway migrations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Full control over your resume data</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full gap-1.5">
                    <span>Inspect Codebase</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Strip */}
      <section className="py-16 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white">
        <div className="container mx-auto max-w-7xl px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold sm:text-4xl max-w-xl mx-auto">
            Take Control of Your Tech Career Pipeline
          </h2>
          <p className="text-indigo-200 text-sm max-w-md mx-auto">
            Track interview milestones, scan ATS requirements, and export tailored PDF resumes in minutes.
          </p>
          <div className="pt-2">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-white/90 font-bold px-8 shadow-xl">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-white/90 font-bold px-8 shadow-xl">
                  Create Free Account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
