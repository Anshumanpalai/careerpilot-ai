import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { applicationsService } from "@/services/applications.service";
import { ApplicationStats, JobApplication } from "@/types/applications.types";
import { StatCard } from "@/components/common/StatCard";
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
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedStats, fetchedApps] = await Promise.all([
        applicationsService.getDashboardStats(),
        applicationsService.getApplications({ sortBy: "appliedDate", sortOrder: "desc" }),
      ]);
      setStats(fetchedStats);
      setRecentApplications(fetchedApps.slice(0, 5));
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

  const goalCompleted = stats?.weeklyGoalCompleted || 0;
  const goalTarget = stats?.weeklyGoalTarget || 5;
  const goalPercent = Math.min(100, Math.round((goalCompleted / goalTarget) * 100));

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & Target Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              <span>AI Job Search Pilot Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good day, {user?.fullName || "Candidate"}!
            </h2>
            <p className="text-indigo-200 text-sm max-w-xl leading-relaxed">
              Target role: <span className="font-semibold text-white">{user?.targetRole || "Software Engineer"}</span>.{" "}
              {stats && stats.totalApplied > 0
                ? `You have ${stats.totalApplied} tracked opportunity in your active pipeline.`
                : "Start logging target job applications to track interview rounds and strategy."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
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
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadDashboardData} />}

      {/* Metrics Row */}
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
              value: stats?.totalApplied ? `${stats.totalApplied} active` : "Empty pipeline",
              isPositive: (stats?.totalApplied || 0) > 0,
            }}
            accentColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Interview Rounds"
            value={stats?.interviewsScheduled || 0}
            subtitle="Scheduled / in progress"
            icon={<Calendar className="h-5 w-5" />}
            trend={{
              value: (stats?.interviewsScheduled || 0) > 0 ? "Active pipeline" : "None scheduled",
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
            subtitle="Calculated from evaluations"
            icon={<Sparkles className="h-5 w-5" />}
            trend={{
              value: stats?.averageMatchScore ? "Match score" : "Not yet evaluated",
              isPositive: (stats?.averageMatchScore || 0) >= 75,
            }}
            accentColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </div>
      )}

      {/* Content Grid: Recent Applications & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Active Application Pipeline</h3>
              <p className="text-xs text-muted-foreground">Most recently updated opportunities</p>
            </div>
            <Link to="/dashboard/applications">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <span>View Full Pipeline</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
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
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No applications recorded yet. Start tracking your job hunt!
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

        {/* Right 1 Col: AI Insights & Next Steps */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
                <CardTitle className="text-sm font-bold">Search Progress & Guidance</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Pipeline milestones and target consistency
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
              </div>

              <div className="rounded-lg border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 space-y-1 text-xs">
                <p className="font-semibold text-indigo-950 dark:text-indigo-200">
                  Target Role Strategy
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Focus applications on your desired role: <span className="font-semibold text-foreground">{user?.targetRole || "Software Engineer"}</span>. Keep your pipeline refreshed with 3-5 applications weekly.
                </p>
                <Link to="/dashboard/applications" className="inline-block pt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Log new target application →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
