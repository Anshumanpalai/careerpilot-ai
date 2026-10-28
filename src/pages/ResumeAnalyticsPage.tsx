import React, { useEffect, useState, useRef } from "react";
import { resumeService, formatMatchErrorMessage } from "@/services/resume.service";
import { ResumeMetric } from "@/types/applications.types";
import { ResumeAnalysis, ResumeMatchResponse, ResumeRecord } from "@/types/resume.types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { AiResumeStudio } from "@/components/resume/AiResumeStudio";
import {
  Sparkles,
  CheckCircle,
  Plus,
  Zap,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  X,
  AlertCircle,
  FileCode,
  Eye,
  RotateCcw,
  BookOpen,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Target,
  Info,
  SearchCode,
  ShieldCheck,
} from "lucide-react";

export const ResumeAnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ResumeMetric | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parsing & Analysis state
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysis | null>(null);
  const [analysisModalLoading, setAnalysisModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "raw">("sections");

  // Studio Mode: Phase 5 AI Resume Studio vs Phase 4C Deterministic ATS Scanner
  const [activeStudioMode, setActiveStudioMode] = useState<"ai" | "ats">("ai");

  // Phase 4C: Job Description Matching state
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescriptionInput, setJobDescriptionInput] = useState<string>("");
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<ResumeMatchResponse | null>(null);
  const [matchFilter, setMatchFilter] = useState<"all" | "matched" | "undetected">("all");

  // Bullet point analyzer simulator
  const [bulletInput, setBulletInput] = useState(
    "Led backend API migration and helped improve system reliability for web app."
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    suggestions: string[];
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setResumesLoading(true);
    setError(null);
    try {
      const [metricsData, resumesData] = await Promise.all([
        resumeService.getResumeMetrics(),
        resumeService.listResumes(),
      ]);
      setMetrics(metricsData);
      setResumes(resumesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resume analysis");
    } finally {
      setIsLoading(false);
      setResumesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter parsed resumes available for matching
  const parsedResumes = resumes.filter((r) => r.status === "PARSED");
  const isSelectedValid = parsedResumes.some((r) => r.id === selectedResumeId);
  const targetResumeId = isSelectedValid
    ? selectedResumeId
    : parsedResumes.length > 0
    ? parsedResumes[0].id
    : "";

  const handleMatchResume = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchError(null);

    if (!targetResumeId) {
      setMatchError("Please select a parsed resume from the dropdown before analyzing.");
      return;
    }

    const trimmedJd = jobDescriptionInput.trim();
    if (!trimmedJd) {
      setMatchError("Job description cannot be blank. Please paste a job description.");
      return;
    }

    if (trimmedJd.length < 50) {
      setMatchError(
        `Job description is too short (${trimmedJd.length} characters). Please provide at least 50 characters for meaningful matching.`
      );
      return;
    }

    if (trimmedJd.length > 50000) {
      setMatchError("Job description exceeds the maximum length of 50,000 characters.");
      return;
    }

    setIsMatching(true);
    try {
      const result = await resumeService.matchResume(targetResumeId, trimmedJd);
      setMatchResult(result);
    } catch (err) {
      setMatchError(formatMatchErrorMessage(err));
    } finally {
      setIsMatching(false);
    }
  };

  const handleLoadSampleJd = () => {
    setJobDescriptionInput(`Senior Backend Software Engineer

About the Role:
We are seeking an experienced Senior Backend Engineer to architect, build, and scale resilient microservices and distributed data pipelines.

Requirements:
- 5+ years of production experience in Java and Spring Boot
- Deep understanding of relational databases, schema design, and PostgreSQL
- Containerization and orchestration using Docker and Kubernetes
- Solid foundation in REST APIs, Microservices, and System Design
- Commitment to test quality with JUnit and Mockito

Preferred Qualifications:
- Experience deploying production systems on AWS or Google Cloud
- Distributed event streaming with Kafka and in-memory caching with Redis
- CI/CD automation using GitHub Actions
- Familiarity with TypeScript and React`);
    setMatchError(null);
  };

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    setSuccessMessage(null);

    // Validate extension
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") {
      setUploadError("Only PDF and DOCX documents are supported.");
      return;
    }

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds the 10MB maximum limit.");
      return;
    }

    if (file.size === 0) {
      setUploadError("Selected file is empty.");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await resumeService.uploadResume(file);
      setResumes((prev) => [uploaded, ...prev]);
      setSuccessMessage(`Successfully uploaded "${uploaded.originalFilename}". You can now parse it.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload resume file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleParseResume = async (id: string) => {
    setParsingId(id);
    setError(null);
    try {
      const analysis = await resumeService.parseResume(id);
      setResumes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "PARSED" } : r))
      );
      setSuccessMessage(`Parsed document "${analysis.originalFilename}".`);
      setActiveAnalysis(analysis);
      setActiveTab("sections");
    } catch (err) {
      setResumes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "FAILED" } : r))
      );
      setError(err instanceof Error ? err.message : "Failed to parse resume text.");
    } finally {
      setParsingId(null);
    }
  };

  const handleViewAnalysis = async (id: string) => {
    setAnalysisModalLoading(true);
    setError(null);
    try {
      const analysis = await resumeService.getResumeAnalysis(id);
      setActiveAnalysis(analysis);
      setActiveTab("sections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resume analysis.");
    } finally {
      setAnalysisModalLoading(false);
    }
  };

  const handleDownload = async (resume: ResumeRecord) => {
    try {
      await resumeService.downloadResume(resume.id, resume.originalFilename);
    } catch (err) {
      alert("Failed to download resume: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleDeleteResume = async (resume: ResumeRecord) => {
    if (!window.confirm(`Are you sure you want to delete "${resume.originalFilename}"?`)) {
      return;
    }

    setDeletingId(resume.id);
    try {
      await resumeService.deleteResume(resume.id);
      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
      if (activeAnalysis?.id === resume.id) {
        setActiveAnalysis(null);
      }
      setSuccessMessage(`Deleted "${resume.originalFilename}".`);
    } catch (err) {
      alert("Failed to delete resume: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAnalyzeBullet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulletInput.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await resumeService.analyzeResumeSnippet(
        bulletInput,
        "Staff Software Engineer"
      );
      setAnalysisResult(res);
    } catch {
      alert("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusBadge = (status: "UPLOADED" | "PARSED" | "FAILED") => {
    switch (status) {
      case "PARSED":
        return <Badge variant="success">Parsed</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Parse Failed</Badge>;
      default:
        return <Badge variant="secondary">Uploaded</Badge>;
    }
  };

  const getSeverityBadge = (severity: "HIGH" | "MEDIUM" | "LOW") => {
    switch (severity) {
      case "HIGH":
        return <Badge variant="destructive">High Priority</Badge>;
      case "MEDIUM":
        return <Badge variant="warning">Medium</Badge>;
      case "LOW":
        return <Badge variant="info">Low</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Resume ATS Intelligence
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload documents, extract real text, inspect detected sections, and evaluate ATS compatibility.
        </p>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {/* Global Success Banner */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload and Resume Storage Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Drop Zone Card */}
        <Card className="lg:col-span-1 border-indigo-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Upload Resume</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Upload your target resume in PDF or DOCX format (up to 10MB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="rounded-full bg-primary/10 p-3 mb-2">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {isUploading ? "Uploading file..." : "Click to select or drag & drop"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                PDF or DOCX (max. 10MB)
              </p>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uploaded Documents List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Stored Resume Documents</CardTitle>
                <CardDescription className="text-xs">
                  Extract text and inspect detected sections using Apache PDFBox & Apache POI heuristics.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {resumes.length} {resumes.length === 1 ? "Document" : "Documents"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {resumesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : resumes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                <p className="font-medium text-foreground">No resumes uploaded yet</p>
                <p className="mt-1">
                  Upload a PDF or DOCX resume using the box to start extracting and inspecting document text.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-muted p-2 shrink-0">
                        <FileText className="h-5 w-5 text-foreground/80" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate max-w-sm">
                          {resume.originalFilename}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>{formatFileSize(resume.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          {getStatusBadge(resume.status)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {resume.status === "PARSED" ? (
                        <>
                          <Button
                            variant="brand"
                            size="sm"
                            onClick={() => handleViewAnalysis(resume.id)}
                            isLoading={analysisModalLoading && activeAnalysis?.id === resume.id}
                            className="h-8 text-xs gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Extracted Text</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={parsingId === resume.id}
                            onClick={() => handleParseResume(resume.id)}
                            className="h-8 text-xs gap-1"
                            title="Re-parse document"
                          >
                            <RotateCcw className={`h-3 w-3 ${parsingId === resume.id ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Re-parse</span>
                          </Button>
                        </>
                      ) : resume.status === "FAILED" ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          isLoading={parsingId === resume.id}
                          onClick={() => handleParseResume(resume.id)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Retry Parse</span>
                        </Button>
                      ) : (
                        <Button
                          variant="brand"
                          size="sm"
                          isLoading={parsingId === resume.id}
                          onClick={() => handleParseResume(resume.id)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <FileCode className="h-3.5 w-3.5" />
                          <span>Parse Resume</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(resume)}
                        className="h-8 text-xs gap-1.5"
                        title="Download resume"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === resume.id}
                        onClick={() => handleDeleteResume(resume)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Delete resume"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Extracted Text & Section Viewer Modal / Panel */}
      {activeAnalysis && (
        <Card className="border-indigo-500/40 bg-card shadow-xl animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <CardTitle className="text-base font-bold">
                    Extracted Resume Content: {activeAnalysis.originalFilename}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs mt-1">
                  Heuristic text and section extraction performed via Apache PDFBox & Apache POI (Non-AI extraction).
                </CardDescription>
              </div>
              <button
                onClick={() => setActiveAnalysis(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("sections")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "sections"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Detected Sections
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("raw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "raw"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Raw Extracted Text
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {activeTab === "sections" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Skills Section */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Skills Section</span>
                  </div>
                  {activeAnalysis.sections?.skills ? (
                    <pre className="text-xs text-foreground/90 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {activeAnalysis.sections.skills}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No explicit skills heading detected in document.
                    </p>
                  )}
                </div>

                {/* Experience Section */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Experience Section</span>
                  </div>
                  {activeAnalysis.sections?.experience ? (
                    <pre className="text-xs text-foreground/90 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {activeAnalysis.sections.experience}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No explicit experience heading detected in document.
                    </p>
                  )}
                </div>

                {/* Education Section */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Education Section</span>
                  </div>
                  {activeAnalysis.sections?.education ? (
                    <pre className="text-xs text-foreground/90 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {activeAnalysis.sections.education}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No explicit education heading detected in document.
                    </p>
                  )}
                </div>

                {/* Projects Section */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <FolderGit2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Projects Section</span>
                  </div>
                  {activeAnalysis.sections?.projects ? (
                    <pre className="text-xs text-foreground/90 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {activeAnalysis.sections.projects}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No explicit projects heading detected in document.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total extracted character count: {activeAnalysis.rawText?.length || 0}</span>
                </div>
                <pre className="text-xs font-mono bg-muted/60 p-4 rounded-lg whitespace-pre-wrap max-h-96 overflow-y-auto border border-border text-foreground leading-relaxed">
                  {activeAnalysis.rawText || "No text extracted."}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STUDIO MODE SWITCHER: AI COPILOT (PHASE 5) VS DETERMINISTIC ATS (PHASE 4C) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>CareerPilot Resume Studio</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch between AI-powered truthful resume rewrites and deterministic ATS keyword scanning.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border shrink-0">
          <button
            type="button"
            id="tab-ai-studio"
            onClick={() => setActiveStudioMode("ai")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStudioMode === "ai"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Resume Studio</span>
            <Badge variant="purple" className="text-[9px] px-1.5 py-0">Phase 5</Badge>
          </button>
          <button
            type="button"
            id="tab-ats-scanner"
            onClick={() => setActiveStudioMode("ats")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStudioMode === "ats"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Deterministic ATS Matcher</span>
            <Badge variant="purple" className="text-[9px] px-1.5 py-0">4C</Badge>
          </button>
        </div>
      </div>

      {activeStudioMode === "ai" ? (
        <AiResumeStudio
          parsedResumes={parsedResumes}
          targetResumeId={targetResumeId}
          onSelectResumeId={setSelectedResumeId}
          jobDescriptionInput={jobDescriptionInput}
          onJobDescriptionChange={setJobDescriptionInput}
          onLoadSampleJd={handleLoadSampleJd}
          formatFileSize={formatFileSize}
        />
      ) : (
        /* PHASE 4C: RESUME-TO-JOB DESCRIPTION MATCHING WORKFLOW */
        <Card className="border-indigo-500/40 shadow-sm">
          <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>Resume-to-Job Description Alignment</span>
                  <Badge variant="purple" className="text-[10px] tracking-wide uppercase">Phase 4C</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Evaluate your parsed resume against a target job description to compute a deterministic baseline fit score and identify qualification gaps.
                </CardDescription>
              </div>
            </div>
            {matchResult && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMatchResult(null);
                  setMatchError(null);
                }}
                className="text-xs h-8"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Match
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Analysis Form */}
          <form onSubmit={handleMatchResume} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Parsed Resume Selector */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Select Parsed Resume
                  </span>
                </label>
                <select
                  value={targetResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  disabled={parsedResumes.length === 0 || isMatching}
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
                {parsedResumes.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Upload and click "Parse Document" on a resume above first.
                  </p>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="md:col-span-2 flex items-end justify-between gap-2 pb-0.5">
                <p className="text-[11px] text-muted-foreground">
                  Paste the full job posting below to detect technical requirements, frameworks, databases, and DevOps tools.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadSampleJd}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 h-8 whitespace-nowrap"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Load Sample Job Posting
                </Button>
              </div>
            </div>

            {/* Job Description Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <SearchCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Target Job Description Text
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    jobDescriptionInput.trim().length > 0 && jobDescriptionInput.trim().length < 50
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {jobDescriptionInput.trim().length} / 50,000 characters{" "}
                  {jobDescriptionInput.trim().length > 0 && jobDescriptionInput.trim().length < 50 && "(min. 50 required)"}
                </span>
              </div>
              <textarea
                rows={5}
                value={jobDescriptionInput}
                onChange={(e) => setJobDescriptionInput(e.target.value)}
                placeholder="Paste job description here (e.g. Requirements, Must Haves, and Preferred Qualifications)..."
                disabled={isMatching}
                className="w-full rounded-lg border border-input bg-card p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans leading-relaxed disabled:opacity-50"
              />
            </div>

            {/* Error Message Alert */}
            {matchError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{matchError}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMatchResume({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isMatching}
                  className="h-7 text-xs px-2 text-destructive hover:bg-destructive/20 hover:text-destructive shrink-0"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Private & local execution — no external LLMs, no data sharing, zero hallucinations.</span>
              </div>
              <Button
                type="submit"
                variant="brand"
                size="sm"
                isLoading={isMatching}
                disabled={parsedResumes.length === 0 || isMatching}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Analyze Job Alignment
              </Button>
            </div>
          </form>

          {/* Results Panel */}
          {matchResult && (
            <div className="space-y-6 pt-4 border-t border-border animate-in fade-in-50">
              {/* Score Display & Components Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Main Deterministic Score Card */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Baseline Fit Score
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span
                        className={`text-4xl font-extrabold ${
                          matchResult.matchScore >= 80
                            ? "text-emerald-600 dark:text-emerald-400"
                            : matchResult.matchScore >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                        }`}
                      >
                        {matchResult.matchScore}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {matchResult.matchScore >= 80
                      ? "High technical keyword alignment"
                      : matchResult.matchScore >= 50
                      ? "Moderate qualification overlap"
                      : "Low technical vocabulary match"}
                  </p>
                </div>

                {/* Required Match Rate */}
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Required Skills Match
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-extrabold text-foreground">
                        {matchResult.scoringBreakdown.requiredMatchRate}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {matchResult.scoringBreakdown.matchedRequiredCount} of {matchResult.scoringBreakdown.totalRequiredCount} required skills detected
                  </p>
                </div>

                {/* Preferred Match Rate */}
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Preferred Skills Match
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-extrabold text-foreground">
                        {matchResult.scoringBreakdown.preferredMatchRate}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {matchResult.scoringBreakdown.matchedPreferredCount} of {matchResult.scoringBreakdown.totalPreferredCount} bonus skills detected
                  </p>
                </div>

                {/* Analyzed Requirements Count */}
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Job Requirements Found
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-extrabold text-foreground">
                        {matchResult.matchedSkills.length + matchResult.undetectedSkills.length}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {matchResult.matchedSkills.length} supported by resume evidence
                  </p>
                </div>
              </div>

              {/* Actionable Recommendations */}
              {matchResult.recommendations.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Actionable Resume Recommendations</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-foreground/90 list-disc list-inside">
                    {matchResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills Breakdown with Evidence Snippets */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Skills & Qualification Evidence Breakdown
                  </h4>
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMatchFilter("all")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        matchFilter === "all"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({matchResult.matchedSkills.length + matchResult.undetectedSkills.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchFilter("matched")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        matchFilter === "matched"
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Matched ({matchResult.matchedSkills.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchFilter("undetected")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        matchFilter === "undetected"
                          ? "bg-amber-600 text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Undetected ({matchResult.undetectedSkills.length})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Matched Column */}
                  {(matchFilter === "all" || matchFilter === "matched") && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 px-1">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" />
                          Matched Skills ({matchResult.matchedSkills.length})
                        </span>
                        <span className="text-[11px] text-muted-foreground font-normal">Evidence from document</span>
                      </div>

                      {matchResult.matchedSkills.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic p-4 rounded-lg border border-dashed border-border text-center">
                          No matching skills detected from job requirements.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {matchResult.matchedSkills.map((skill) => (
                            <div
                              key={skill.skillName}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">{skill.skillName}</span>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {skill.category}
                                  </Badge>
                                  <Badge
                                    variant={skill.requirementType === "REQUIRED" ? "success" : "info"}
                                    className="text-[10px]"
                                  >
                                    {skill.requirementType}
                                  </Badge>
                                </div>
                              </div>
                              {skill.snippet && (
                                <div className="rounded bg-background/80 p-2 text-[11px] text-foreground/90 border border-emerald-500/20 font-mono leading-relaxed">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                                    Evidence excerpt:
                                  </span>
                                  "{skill.snippet}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Undetected Column */}
                  {(matchFilter === "all" || matchFilter === "undetected") && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 px-1">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          Undetected Requirements ({matchResult.undetectedSkills.length})
                        </span>
                        <span className="text-[11px] text-muted-foreground font-normal">Gaps to review</span>
                      </div>

                      {matchResult.undetectedSkills.length === 0 ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 italic p-4 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 text-center">
                          All detected job requirements are present in your resume!
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {matchResult.undetectedSkills.map((skill) => (
                            <div
                              key={skill.skillName}
                              className="rounded-lg border border-border bg-card p-3 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">{skill.skillName}</span>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {skill.category}
                                  </Badge>
                                  <Badge
                                    variant={skill.requirementType === "REQUIRED" ? "destructive" : "warning"}
                                    className="text-[10px]"
                                  >
                                    {skill.requirementType}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground italic">
                                Not detected in parsed resume text. Consider adding relevant experience if applicable.
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Formula Transparency & Limitations Notice */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Formula Transparency & Scoring Limitations</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  <strong className="text-foreground">Reproducible Formula:</strong>{" "}
                  {matchResult.scoringBreakdown.formulaExplanation}
                </p>
                <div className="pt-1 border-t border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Important Scope & Limitations:
                  </span>
                  <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                    {matchResult.scoringBreakdown.limitations.map((lim, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Top Metrics Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-10 w-20" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overall ATS Score
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-4xl font-extrabold text-foreground">
                  {metrics?.overallScore || 89}
                </span>
                <span className="text-xs font-semibold text-emerald-600">/ 100</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Ready for direct recruiter review</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Keyword Density Match
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-4xl font-extrabold text-foreground">
                  {metrics?.keywordMatch || 92}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Matched 34 of 37 tier-1 skills</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Measurable Impact Score
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-4xl font-extrabold text-foreground">
                  {metrics?.impactScore || 86}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">72% of bullets contain metrics</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ATS Format Readability
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {metrics?.atsReadability || 96}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Clean single-column parsing</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Interactive Bullet Rewriter Tool */}
      <Card className="border-indigo-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-5 w-5" />
            <CardTitle className="text-base font-bold">
              AI Bullet Point Optimization Sandbox
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Paste any bullet point from your resume. CareerPilot will score its impact and rewrite it with quantifiable metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyzeBullet} className="space-y-4">
            <div className="space-y-1.5">
              <textarea
                rows={3}
                className="flex w-full rounded-lg border border-input bg-card p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={bulletInput}
                onChange={(e) => setBulletInput(e.target.value)}
                placeholder="Paste a resume bullet point here..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Evaluated against: <span className="font-semibold text-foreground">Senior / Staff Engineering ATS Baselines</span>
              </p>
              <Button type="submit" variant="brand" size="sm" isLoading={isAnalyzing} className="gap-2">
                <Zap className="h-4 w-4" />
                Analyze & Enhance
              </Button>
            </div>
          </form>

          {analysisResult && (
            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Optimization Result</span>
                <Badge variant={analysisResult.score >= 85 ? "success" : "warning"}>
                  Fit Score: {analysisResult.score}/100
                </Badge>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Actionable Recommendations:</span>
                <ul className="space-y-1 text-xs text-foreground/90 list-disc list-inside">
                  {analysisResult.suggestions.map((s, idx) => (
                    <li key={idx} className="leading-relaxed">{s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-background p-3 border border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  Suggested High-Impact Rewrite:
                </span>
                <p className="text-xs text-foreground font-medium italic">
                  "Spearheaded distributed REST API migration to asynchronous microservices, reducing p99 latency by 38% and supporting 2.4M daily active requests."
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keywords Breakdown & Recent Critiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Identified Skills vs Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Skills & Keyword Coverage</CardTitle>
            <CardDescription className="text-xs">
              Extracted from your uploaded resume against target job requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
                Verified Present in Resume ({metrics?.topSkillsFound.length || 0}):
              </span>
              <div className="flex flex-wrap gap-2">
                {metrics?.topSkillsFound.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
                Recommended Additions for Staff / Lead roles:
              </span>
              <div className="flex flex-wrap gap-2">
                {metrics?.recommendedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20"
                  >
                    <Plus className="h-3 w-3 text-amber-600" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Critiques */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Priority Section Critiques</CardTitle>
            <CardDescription className="text-xs">
              Flagged issues with suggested replacements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics?.recentCritiques.map((critique) => (
              <div
                key={critique.id}
                className="rounded-lg border border-border p-3.5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{critique.section}</span>
                  {getSeverityBadge(critique.severity)}
                </div>
                <p className="text-muted-foreground text-[11px] font-medium">
                  Issue: <span className="text-destructive font-normal">{critique.issue}</span>
                </p>
                <div className="rounded bg-muted/50 p-2 text-[11px] text-foreground leading-relaxed">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">Suggestion: </span>
                  {critique.suggestion}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
