import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resumeService, formatImprovementErrorMessage } from "@/services/resume.service";
import { ResumeImprovementResponse, ResumeRecord } from "@/types/resume.types";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Target,
  FileText,
  Lock,
  Clock,
  Compass,
  BookOpen,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

interface AiResumeStudioProps {
  parsedResumes: ResumeRecord[];
  targetResumeId: string;
  onSelectResumeId: (id: string) => void;
  jobDescriptionInput: string;
  onJobDescriptionChange: (jd: string) => void;
  onLoadSampleJd: () => void;
  formatFileSize: (bytes: number) => string;
}

export const AiResumeStudio: React.FC<AiResumeStudioProps> = ({
  parsedResumes,
  targetResumeId,
  onSelectResumeId,
  jobDescriptionInput,
  onJobDescriptionChange,
  onLoadSampleJd,
  formatFileSize,
}) => {
  const [targetRole, setTargetRole] = useState("Senior Backend Engineer");
  const [userConsent, setUserConsent] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvementResult, setImprovementResult] = useState<ResumeImprovementResponse | null>(null);

  // User decision state (Accepted / Rejected) - Local only, never touches original resume
  const [acceptedSummary, setAcceptedSummary] = useState<boolean | null>(null);
  const [acceptedBullets, setAcceptedBullets] = useState<Record<number, boolean | null>>({});
  const [checkedRoadmapTasks, setCheckedRoadmapTasks] = useState<Record<string, boolean>>({});

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active section filter in recommendations
  const [activeSectionTab, setActiveSectionTab] = useState<
    "all" | "summary" | "bullets" | "skills" | "gaps" | "roadmap"
  >("all");

  // Load existing latest improvement report for the selected resume
  useEffect(() => {
    let isMounted = true;
    if (targetResumeId) {
      resumeService.getLatestImprovement(targetResumeId).then((existing) => {
        if (isMounted && existing) {
          setImprovementResult(existing);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [targetResumeId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleToggleBulletDecision = (index: number, accept: boolean) => {
    setAcceptedBullets((prev) => ({
      ...prev,
      [index]: prev[index] === accept ? null : accept,
    }));
  };

  const handleToggleRoadmapTask = (taskKey: string) => {
    setCheckedRoadmapTasks((prev) => ({
      ...prev,
      [taskKey]: !prev[taskKey],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImproving) {
      return;
    }
    setError(null);

    if (!targetResumeId) {
      setError("Please select a parsed resume from the dropdown before generating recommendations.");
      return;
    }

    const trimmedJd = jobDescriptionInput.trim();
    if (!trimmedJd) {
      setError("Target job description cannot be blank. Please paste a job description.");
      return;
    }

    if (trimmedJd.length < 50) {
      setError(
        `Job description is too short (${trimmedJd.length} characters). Please provide at least 50 characters for meaningful analysis.`
      );
      return;
    }

    if (trimmedJd.length > 50000) {
      setError("Job description exceeds the maximum limit of 50,000 characters.");
      return;
    }

    if (!userConsent) {
      setError(
        "Explicit user consent is required before transmitting resume text and the job description to the external AI provider."
      );
      return;
    }

    setIsImproving(true);
    try {
      const response = await resumeService.improveResume(targetResumeId, {
        jobDescription: trimmedJd,
        userConsent: true,
        targetRole: targetRole.trim() || undefined,
      });
      setImprovementResult(response);
      setAcceptedSummary(null);
      setAcceptedBullets({});
    } catch (err) {
      setError(formatImprovementErrorMessage(err));
    } finally {
      setIsImproving(false);
    }
  };

  const is503Error =
    error?.toLowerCase().includes("disabled") ||
    error?.includes("AI_ENABLED") ||
    error?.toLowerCase().includes("unconfigured") ||
    error?.toLowerCase().includes("offline");

  return (
    <Card className="border-indigo-500/40 shadow-sm overflow-hidden">
      {/* Studio Card Header */}
      <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">
                  AI-Powered Resume Tailoring & Recommendations
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Generate truthful summary rewrites, bullet point optimizations with evidence prompts, verified skills, and an actionable learning roadmap.
              </CardDescription>
            </div>
          </div>

          {improvementResult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImprovementResult(null);
                setError(null);
              }}
              className="text-xs h-8 gap-1 self-start sm:self-center"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>New Analysis</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Parsed Resume Selector */}
            <div className="space-y-1.5 md:col-span-1">
              <label htmlFor="ai-resume-select" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Select Parsed Resume
                </span>
                <span className="text-[11px] text-muted-foreground">Required</span>
              </label>
              <select
                id="ai-resume-select"
                value={targetResumeId}
                onChange={(e) => onSelectResumeId(e.target.value)}
                disabled={parsedResumes.length === 0 || isImproving}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {parsedResumes.length === 0 ? (
                  <option value="">No parsed resumes available</option>
                ) : (
                  parsedResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.originalFilename} ({formatFileSize(r.fileSize)})
                    </option>
                  ))
                )}
              </select>
              {parsedResumes.length === 0 ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Upload and parse a resume in the panel above first.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Only parsed text from this document is transmitted.
                </p>
              )}
            </div>

            {/* Target Role Input */}
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="ai-target-role" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Target Role / Title
                </span>
                <span className="text-[11px] text-muted-foreground">Optional</span>
              </label>
              <input
                id="ai-target-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Staff Architect"
                disabled={isImproving}
                maxLength={150}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Helps the AI frame the professional summary and prioritize recommendations.
              </p>
            </div>
          </div>

          {/* Job Description Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="ai-job-description" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Target Job Description</span>
                <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onLoadSampleJd}
                  disabled={isImproving}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Load Sample Job Description
                </button>
                <span
                  className={`text-[11px] font-mono ${
                    jobDescriptionInput.trim().length > 50000
                      ? "text-destructive font-bold"
                      : jobDescriptionInput.trim().length < 50 && jobDescriptionInput.trim().length > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {jobDescriptionInput.length.toLocaleString()} / 50,000 chars
                </span>
              </div>
            </div>

            <textarea
              id="ai-job-description"
              rows={6}
              value={jobDescriptionInput}
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              placeholder="Paste complete job requirements, qualifications, and role description here (minimum 50 characters)..."
              disabled={isImproving}
              className="w-full rounded-lg border border-input bg-card p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans leading-relaxed disabled:opacity-50 resize-y"
            />
          </div>

          {/* Explicit Privacy & External AI Processing Consent Banner */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Privacy & External AI Processing Notice
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  To provide tailored career recommendations, your parsed resume text and the job description above will be transmitted to the configured external LLM provider. No account passwords, API credentials, or raw uploaded files are sent. Your original resume remains immutable and will never be automatically modified.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1 border-t border-indigo-500/20">
              <input
                id="ai-consent-checkbox"
                type="checkbox"
                checked={userConsent}
                onChange={(e) => setUserConsent(e.target.checked)}
                disabled={isImproving}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary mt-0.5 cursor-pointer disabled:opacity-50"
              />
              <label
                htmlFor="ai-consent-checkbox"
                className="text-xs font-semibold text-foreground cursor-pointer select-none leading-snug"
              >
                I explicitly consent to transmitting my parsed resume text and this job description to the external AI provider for generating tailored improvement recommendations.
              </label>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Strict anti-hallucination safeguards enforced. Facts preserved.</span>
            </div>

            <Button
              id="ai-generate-button"
              type="submit"
              variant="brand"
              isLoading={isImproving}
              disabled={
                parsedResumes.length === 0 ||
                jobDescriptionInput.trim().length < 50 ||
                !userConsent ||
                isImproving
              }
              className="px-6 gap-2 text-xs h-10 shadow-md font-semibold"
            >
              {!isImproving && <Sparkles className="h-4 w-4" />}
              <span>{isImproving ? "Generating recommendations..." : "Generate AI Recommendations"}</span>
            </Button>
          </div>
        </form>

        {/* Loading State with Informative Guidance */}
        {isImproving && (
          <div className="rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-6 text-center space-y-4">
            <div className="inline-flex rounded-full bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-foreground">
                Generating recommendations...
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Analyzing qualifications, drafting tailored bullet point rewrites, and structuring your learning roadmap with Gemini AI.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-medium pt-1">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Waiting for secure AI provider response (typically 5–15 seconds)...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isImproving && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <h4 className="text-xs font-bold text-destructive">
                  {is503Error ? "AI Service Offline or Disabled (AI_ENABLED=false)" : "AI Processing Failed"}
                </h4>
                <p className="text-xs text-foreground/90 leading-relaxed">{error}</p>
                {is503Error && (
                  <div className="rounded-lg bg-card p-3 mt-2 border border-border text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                      Administrator Configuration Note:
                    </p>
                    <p>
                      To enable AI recommendations, set <code className="px-1 py-0.5 rounded bg-muted font-mono">AI_ENABLED=true</code> and provide a <code className="px-1 py-0.5 rounded bg-muted font-mono">GEMINI_API_KEY</code> (or <code className="px-1 py-0.5 rounded bg-muted font-mono">AI_API_KEY</code>) in the backend environment. Local parsing and ATS keyword scanning remain 100% operational.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSubmit}
                className="text-xs h-8 gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry Analysis</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RECOMMENDATION RESULTS                                                    */}
        {/* ========================================================================= */}
        {improvementResult && !isImproving && (
          <div className="space-y-6 pt-2">
            {/* Metadata & Strict Accuracy Disclaimer Banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Factual Grounding & Integrity Verified
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Provider: {improvementResult.providerName}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Model: {improvementResult.modelName}
                  </Badge>
                  <span>
                    Generated: {new Date(improvementResult.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {improvementResult.complianceNotice}
              </p>
            </div>

            {/* Quick Section Filter Bar */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              {[
                { id: "all", label: "Full Report" },
                { id: "summary", label: "Summary Rewrite" },
                { id: "bullets", label: `Bullet Suggestions (${improvementResult.bulletPointSuggestions.length})` },
                { id: "skills", label: `Evidenced Skills (${improvementResult.evidencedSkills.length})` },
                { id: "gaps", label: `Learning Gaps (${improvementResult.learningGaps.length})` },
                { id: "roadmap", label: `Learning Roadmap (${improvementResult.learningRoadmap.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSectionTab(tab.id as typeof activeSectionTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSectionTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* SECTION 1: PROFESSIONAL SUMMARY REWRITE */}
            {(activeSectionTab === "all" || activeSectionTab === "summary") && (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Professional Summary Optimization</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {acceptedSummary === true ? (
                        <Badge variant="success" className="gap-1 text-[10px]">
                          <Check className="h-3 w-3" />
                          <span>Accepted</span>
                        </Badge>
                      ) : acceptedSummary === false ? (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <ThumbsDown className="h-3 w-3" />
                          <span>Rejected</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Pending Review
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Summary */}
                    <div className="rounded-lg border border-border p-3.5 space-y-2 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Original Candidate Profile
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(improvementResult.improvedSummary.original, "summary-orig")}
                          className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
                        >
                          {copiedKey === "summary-orig" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === "summary-orig" ? "Copied" : "Copy"}</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        "{improvementResult.improvedSummary.original}"
                      </p>
                    </div>

                    {/* Suggested Summary */}
                    <div className="rounded-lg border border-indigo-500/30 p-3.5 space-y-2 bg-indigo-500/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Suggested Tailored Summary
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(improvementResult.improvedSummary.suggested, "summary-sugg")}
                          className="h-6 px-2 text-[10px] gap-1 text-indigo-600 dark:text-indigo-400"
                        >
                          {copiedKey === "summary-sugg" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === "summary-sugg" ? "Copied" : "Copy"}</span>
                        </Button>
                      </div>
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        "{improvementResult.improvedSummary.suggested}"
                      </p>
                    </div>
                  </div>

                  {/* Summary Rationale */}
                  {improvementResult.improvedSummary.rationale && (
                    <div className="rounded-lg bg-muted/50 p-3 border border-border text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Why this works: </span>
                      {improvementResult.improvedSummary.rationale}
                    </div>
                  )}

                  {/* Summary Decision Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                    <Button
                      type="button"
                      variant={acceptedSummary === false ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setAcceptedSummary(acceptedSummary === false ? null : false)}
                      className="text-xs h-7 gap-1"
                    >
                      <ThumbsDown className="h-3 w-3" />
                      <span>{acceptedSummary === false ? "Rejected" : "Reject"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant={acceptedSummary === true ? "brand" : "outline"}
                      size="sm"
                      onClick={() => setAcceptedSummary(acceptedSummary === true ? null : true)}
                      className="text-xs h-7 gap-1"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>{acceptedSummary === true ? "Accepted" : "Accept Suggestion"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SECTION 2: BULLET POINT REWRITES & EVIDENCE PROMPTS */}
            {(activeSectionTab === "all" || activeSectionTab === "bullets") && (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Experience & Project Bullet Point Rewrites</span>
                        <Badge variant="outline" className="text-[10px]">
                          {improvementResult.bulletPointSuggestions.length} Suggestions
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Enhanced with action verbs and job-relevant context. Metric suggestions require your personal verification.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {improvementResult.bulletPointSuggestions.map((bullet, idx) => {
                    const isAccepted = acceptedBullets[idx] === true;
                    const isRejected = acceptedBullets[idx] === false;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 space-y-3 transition-colors ${
                          isAccepted
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : isRejected
                            ? "border-destructive/30 bg-destructive/5 opacity-70"
                            : "border-border bg-card hover:border-indigo-500/30"
                        }`}
                      >
                        {/* Bullet Card Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              Bullet #{idx + 1}
                            </span>
                            {isAccepted && (
                              <Badge variant="success" className="text-[10px] gap-1">
                                <Check className="h-3 w-3" />
                                <span>Accepted</span>
                              </Badge>
                            )}
                            {isRejected && (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <ThumbsDown className="h-3 w-3" />
                                <span>Rejected</span>
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(bullet.suggested, `bullet-${idx}`)}
                              className="h-7 px-2 text-[11px] gap-1"
                            >
                              {copiedKey === `bullet-${idx}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span>{copiedKey === `bullet-${idx}` ? "Copied" : "Copy Suggestion"}</span>
                            </Button>
                            <Button
                              type="button"
                              variant={isRejected ? "destructive" : "ghost"}
                              size="sm"
                              onClick={() => handleToggleBulletDecision(idx, false)}
                              className="h-7 px-2 text-[11px] gap-1"
                              title="Reject suggestion"
                            >
                              <ThumbsDown className="h-3 w-3" />
                              <span className="hidden sm:inline">Reject</span>
                            </Button>
                            <Button
                              type="button"
                              variant={isAccepted ? "brand" : "outline"}
                              size="sm"
                              onClick={() => handleToggleBulletDecision(idx, true)}
                              className="h-7 px-2 text-[11px] gap-1"
                              title="Accept suggestion"
                            >
                              <ThumbsUp className="h-3 w-3" />
                              <span className="hidden sm:inline">Accept</span>
                            </Button>
                          </div>
                        </div>

                        {/* Comparison Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Original */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Original Bullet
                            </span>
                            <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground leading-relaxed line-through">
                              {bullet.original}
                            </div>
                          </div>

                          {/* Suggested */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              Suggested Rewrite
                            </span>
                            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-xs text-foreground font-medium leading-relaxed">
                              {bullet.suggested}
                            </div>
                          </div>
                        </div>

                        {/* Unsupported Metric / Requires Evidence Warning Box */}
                        {bullet.requiresUserEvidence && (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold">Requires Personal Evidence Verification:</span>
                              <p className="text-[11px] leading-relaxed">
                                {bullet.evidencePrompt ||
                                  "Please verify the quantified metric or business impact in your actual project experience before using this suggestion."}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Rationale */}
                        {bullet.rationale && (
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Rationale: </span>
                            {bullet.rationale}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* SECTION 3 & 4: EVIDENCED SKILLS VS LEARNING GAPS (2-Column Grid) */}
            {(activeSectionTab === "all" || activeSectionTab === "skills" || activeSectionTab === "gaps") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evidenced Skills */}
                {(activeSectionTab === "all" || activeSectionTab === "skills") && (
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3 border-b border-border bg-emerald-500/5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Job-Relevant Skills Evidenced in Resume</span>
                        </CardTitle>
                        <Badge variant="success" className="text-[10px]">
                          {improvementResult.evidencedSkills.length} Verified
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Skills extracted directly from your verified background matching job requirements.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      {improvementResult.evidencedSkills.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No direct skill matches detected in text.
                        </p>
                      ) : (
                        improvementResult.evidencedSkills.map((skill, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">
                                {skill.skill}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {skill.category}
                              </Badge>
                            </div>
                            {skill.evidenceSnippet && (
                              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 italic font-mono leading-tight bg-card/60 p-1.5 rounded border border-emerald-500/10">
                                "{skill.evidenceSnippet}"
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Missing Requirements (Learning Gaps) */}
                {(activeSectionTab === "all" || activeSectionTab === "gaps") && (
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3 border-b border-border bg-destructive/5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span>Missing Requirements (Learning Gaps)</span>
                        </CardTitle>
                        <Badge variant="destructive" className="text-[10px]">
                          {improvementResult.learningGaps.length} Gaps
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Qualifications required by the job that are not currently in your resume. Labeled strictly as learning gaps.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      {improvementResult.learningGaps.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No significant qualification gaps identified.
                        </p>
                      ) : (
                        improvementResult.learningGaps.map((gap, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">
                                {gap.missingRequirement}
                              </span>
                              <Badge
                                variant={gap.importance === "REQUIRED" ? "destructive" : "warning"}
                                className="text-[10px]"
                              >
                                {gap.importance}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {gap.reason}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* SECTION 5: PRIORITIZED RECOMMENDATIONS */}
            {activeSectionTab === "all" && (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border bg-muted/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Compass className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Prioritized Career Alignment Recommendations</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Targeted strategic steps to elevate your candidacy for this role.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {improvementResult.prioritizedRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border p-3.5 space-y-1.5 bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">
                          {rec.title}
                        </span>
                        <Badge
                          variant={
                            rec.priority.toUpperCase() === "HIGH"
                              ? "destructive"
                              : rec.priority.toUpperCase() === "MEDIUM"
                              ? "warning"
                              : "info"
                          }
                          className="text-[10px]"
                        >
                          {rec.priority} Priority
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {rec.actionableAdvice}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* SECTION 6: SKILL-GAP LEARNING ROADMAP */}
            {(activeSectionTab === "all" || activeSectionTab === "roadmap") && (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border bg-indigo-500/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Skill-Gap Learning Roadmap</span>
                    </CardTitle>
                    <Badge variant="purple" className="text-[10px]">
                      {improvementResult.learningRoadmap.length} Modules
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Practical, actionable roadmap tasks to bridge each missing requirement before applying.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {improvementResult.learningRoadmap.map((roadmapItem, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border p-4 space-y-3 bg-muted/10"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {roadmapItem.skill}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Estimated Time: {roadmapItem.estimatedTimeToAcquire}</span>
                        </div>
                      </div>

                      {/* Action Steps Checklist */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Action Steps:
                        </span>
                        <div className="space-y-1.5">
                          {roadmapItem.actionSteps.map((step, stepIdx) => {
                            const taskKey = `${roadmapItem.skill}-${stepIdx}`;
                            const isDone = !!checkedRoadmapTasks[taskKey];

                            return (
                              <div
                                key={stepIdx}
                                onClick={() => handleToggleRoadmapTask(taskKey)}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                                  isDone
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300 line-through"
                                    : "bg-card border-border text-foreground hover:bg-muted/40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => {}} // Handled by parent div onClick
                                  className="h-3.5 w-3.5 rounded border-input text-primary mt-0.5 pointer-events-none"
                                />
                                <span className="leading-snug">{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recommended Topics */}
                      {roadmapItem.recommendedTopics && roadmapItem.recommendedTopics.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Recommended Study Topics:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {roadmapItem.recommendedTopics.map((topic, topicIdx) => (
                              <span
                                key={topicIdx}
                                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border"
                              >
                                <ChevronRight className="h-3 w-3 text-indigo-500" />
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
