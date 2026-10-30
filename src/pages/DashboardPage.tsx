import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { applicationsService } from "@/services/applications.service";
import { resumeService } from "@/services/resume.service";
import { ApplicationStats, JobApplication } from "@/types/applications.types";
import { ResumeRecord } from "@/types/resume.types";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import {
  Briefcase,
  Calendar,
  Sparkles,
  Trophy,
  Plus,
  FileText,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Circle,
  Compass,
  ArrowRight,
  UploadCloud,
  Check,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedStats, fetchedApps, fetchedResumes] = await Promise.all([
        applicationsService.getDashboardStats(),
        applicationsService.getApplications({ sortBy: "appliedDate", sortOrder: "desc" }),
        resumeService.listResumes(),
      ]);
      setStats(fetchedStats);
      setRecentApplications(fetchedApps.slice(0, 5));
      setResumes(fetchedResumes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "OFFER":
        return "success";
      case "INTERVIEWING":
        return "purple";
      case "SCREENING":
        return "info";
      case "APPLIED":
        return "default";
      case "REJECTED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Real data derivations
  const hasResume = resumes.length > 0;
  const hasParsedResume = resumes.some((r) => r.status === "PARSED");
  const hasAtsEvaluation =
    (stats?.averageMatchScore || 0) > 0 ||
    recentApplications.some((a) => a.matchScore != null && a.matchScore > 0);
  const hasApplications = (stats?.totalApplied || 0) > 0;
  const isFirstTimeUser = !hasResume && !hasApplications;

  // Onboarding Quick-Start Checklist items
  const checklistSteps = [
    {
      id: "upload",
      title: "Upload your resume",
      description: "Upload your existing PDF or DOCX resume document to CareerPilot.",
      completed: hasResume,
      actionLabel: "Upload Resume",
      actionTo: "/dashboard/resume",
    },
    {
      id: "parse",
      title: "Parse resume content",
      description: "Extract text sections and skills using our ATS parsing engine.",
      completed: hasParsedResume,
      actionLabel: "Parse Resume",
      actionTo: "/dashboard/resume",
    },
    {
      id: "ats",
      title: "Evaluate ATS keywords",
      description: "Scan your resume against job requirements to calculate your match score.",
      completed: hasAtsEvaluation,
      actionLabel: "Audit ATS",
      actionTo: "/dashboard/resume",
    },
    {
      id: "track",
      title: "Log first job opportunity",
      description: "Track companies, interview stages, and offers in your pipeline.",
      completed: hasApplications,
      actionLabel: "Add Application",
      actionTo: "/dashboard/applications",
    },
  ];

  const completedStepsCount = checklistSteps.filter((s) => s.completed).length;
  const totalStepsCount = checklistSteps.length;
  const checklistPercent = Math.round((completedStepsCount / totalStepsCount) * 100);

  // Weekly Goal metrics from real persisted stats
  const goalCompleted = stats?.weeklyGoalCompleted || 0;
  const goalTarget = stats?.weeklyGoalTarget || 5;
  const goalPercent = Math.min(100, Math.round((goalCompleted / goalTarget) * 100));

  // Context-aware banner copy
  const getBannerMessage = () => {
    if (isFirstTimeUser) {
      return "Welcome to CareerPilot AI. Start by uploading your resume to unlock AI keyword tailoring, ATS optimization, and application pipeline tracking.";
    }
    if (hasResume && !hasParsedResume) {
      return "Your resume is uploaded. Extract its sections in Resume Intelligence to begin tailoring and keyword scoring.";
    }
    if (hasParsedResume && !hasApplications) {
      return "Your resume is parsed and ready. Log your first opportunity in Job Applications to start tracking pipeline milestones.";
    }
    return `You have ${stats?.totalApplied || 0} tracked ${(stats?.totalApplied || 0) === 1 ? "opportunity" : "opportunities"} with ${stats?.interviewsScheduled || 0} active interview ${(stats?.interviewsScheduled || 0) === 1 ? "round" : "rounds"}.`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & Target Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              <span>Career Copilot Workspace</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good day, {user?.fullName || "Candidate"}!
            </h2>
            <p className="text-indigo-200 text-sm max-w-xl leading-relaxed">
              Target role: <span className="font-semibold text-white">{user?.targetRole || "Software Engineer"}</span>.{" "}
              {getBannerMessage()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!hasResume ? (
              <>
                <Link to="/dashboard/resume">
                  <Button className="bg-white text-indigo-900 hover:bg-white/90 gap-1.5 font-semibold text-xs h-9">
                    <UploadCloud className="h-4 w-4" />
                    Upload Resume
                  </Button>
                </Link>
                <Link to="/dashboard/applications">
                  <Button
                    variant="ghost"
                    className="bg-white/15 hover:bg-white text-white hover:text-indigo-950 border border-white/40 gap-1.5 text-xs h-9 font-semibold transition-all shadow-sm backdrop-blur-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Application
                  </Button>
                </Link>
              </>
            ) : !hasApplications ? (
              <>
                <Link to="/dashboard/applications">
                  <Button className="bg-white text-indigo-900 hover:bg-white/90 gap-1.5 font-semibold text-xs h-9">
                    <Plus className="h-4 w-4" />
                    Track Application
                  </Button>
                </Link>
                <Link to="/dashboard/resume">
                  <Button
                    variant="ghost"
                    className="bg-white/15 hover:bg-white text-white hover:text-indigo-950 border border-white/40 gap-1.5 text-xs h-9 font-semibold transition-all shadow-sm backdrop-blur-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Audit Resume ATS
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard/applications">
                  <Button className="bg-white text-indigo-900 hover:bg-white/90 gap-1.5 font-semibold text-xs h-9">
                    <Plus className="h-4 w-4" />
                    Add Application
                  </Button>
                </Link>
                <Link to="/dashboard/resume">
                  <Button
                    variant="ghost"
                    className="bg-white/15 hover:bg-white text-white hover:text-indigo-950 border border-white/40 gap-1.5 text-xs h-9 font-semibold transition-all shadow-sm backdrop-blur-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Audit Resume ATS
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadDashboardData} />}

      {/* Metrics Row (Derived from Real Persisted Data) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Applications"
            value={stats?.totalApplied || 0}
            subtitle={`${stats?.weeklyGoalCompleted || 0} logged recently`}
            icon={<Briefcase className="h-5 w-5" />}
            trend={{
              value: (stats?.totalApplied || 0) > 0 ? `${stats?.totalApplied} tracked` : "None yet",
              isPositive: (stats?.totalApplied || 0) > 0,
            }}
            accentColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Interview Rounds"
            value={stats?.interviewsScheduled || 0}
            subtitle="Scheduled or in progress"
            icon={<Calendar className="h-5 w-5" />}
            trend={{
              value: (stats?.interviewsScheduled || 0) > 0 ? "Active interviews" : "None scheduled",
              isPositive: (stats?.interviewsScheduled || 0) > 0,
            }}
            accentColor="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          />
          <StatCard
            title="Offers Received"
            value={stats?.offersReceived || 0}
            subtitle="Offers in hand"
            icon={<Trophy className="h-5 w-5" />}
            trend={{
              value: (stats?.offersReceived || 0) > 0 ? "Offer stage" : "No offers yet",
              isPositive: (stats?.offersReceived || 0) > 0,
            }}
            accentColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            title="Avg ATS Match Score"
            value={stats?.averageMatchScore ? `${stats.averageMatchScore}%` : "N/A"}
            subtitle={stats?.averageMatchScore ? "From evaluated applications" : "No evaluations yet"}
            icon={<Sparkles className="h-5 w-5" />}
            trend={{
              value: stats?.averageMatchScore ? `${stats.averageMatchScore}% avg` : "Not evaluated",
              isPositive: (stats?.averageMatchScore || 0) >= 70,
            }}
            accentColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </div>
      )}

      {/* Content Grid: Recent Applications (Left 2 Cols) & Guidance / Checklist (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Application Pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Active Application Pipeline</h3>
              <p className="text-xs text-muted-foreground">Most recently updated opportunities</p>
            </div>
            {recentApplications.length > 0 && (
              <Link to="/dashboard/applications">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <span>View Full Pipeline</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : recentApplications.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Briefcase className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />}
                    title="Your application pipeline is empty"
                    description="Keep your job search organized. Log target companies, job requirements, salary ranges, and track interview stages from application to offer."
                    actionLabel="Track Your First Application"
                    onAction={() => {
                      window.location.href = "/dashboard/applications";
                    }}
                    className="border-0 bg-transparent py-6"
                  />
                </div>
              ) : (
                recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{app.companyName}</span>
                        <Badge variant={getStatusBadgeVariant(app.status)}>
                          {app.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{app.jobTitle}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {app.location || "Remote"}
                        </span>
                        {app.salaryRange && <span>• {app.salaryRange}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-semibold text-foreground">
                          {app.matchScore != null ? `${app.matchScore}%` : "--"}
                        </span>
                        <p className="text-[10px] text-muted-foreground">ATS Match</p>
                      </div>
                      <Link to="/dashboard/applications">
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Onboarding Checklist & Progress Guidance */}
        <div className="space-y-6">
          {/* Quick-Start Onboarding Checklist */}
          <Card className="border-indigo-500/30 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Compass className="h-4 w-4" />
                  <CardTitle className="text-sm font-bold">Quick-Start Checklist</CardTitle>
                </div>
                <Badge variant={completedStepsCount === totalStepsCount ? "success" : "default"} className="text-[10px]">
                  {completedStepsCount}/{totalStepsCount} Done
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Essential milestones to unlock CareerPilot AI's full capabilities
              </CardDescription>

              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-3">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {checklistSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    step.completed
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-semibold ${step.completed ? "text-emerald-950 dark:text-emerald-200 line-through opacity-80" : "text-foreground"}`}>
                          {idx + 1}. {step.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    {!step.completed ? (
                      <Link to={step.actionTo} className="shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2 gap-1">
                          <span>{step.actionLabel}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5">
                        <Check className="h-3 w-3" /> Done
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Goal & Momentum Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
                <CardTitle className="text-sm font-bold">Search Progress & Goals</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Application pacing and resume workspace status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="rounded-lg border border-border p-3 space-y-1 text-xs">
                <p className="font-semibold text-foreground">
                  Weekly Application Goal
                </p>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Logged this week</span>
                  <span className="font-semibold text-foreground">
                    {goalCompleted} of {goalTarget} target
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                  {goalCompleted === 0
                    ? "Log applications as you submit them to track conversion rates."
                    : goalCompleted >= goalTarget
                    ? "Weekly goal reached! Outstanding momentum on your search."
                    : `${goalTarget - goalCompleted} more to achieve your weekly target of ${goalTarget} applications.`}
                </p>
              </div>

              {/* Resume Workspace Summary */}
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Resume Documents
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    {resumes.length} {resumes.length === 1 ? "File" : "Files"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {resumes.length === 0
                    ? "Upload your master resume to enable ATS keyword analysis and tailored AI revisions."
                    : `Active document: ${resumes[0].originalFilename} (${resumes[0].status.toLowerCase()}).`}
                </p>
                <Link
                  to="/dashboard/resume"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5"
                >
                  <span>Open Resume Intelligence</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
