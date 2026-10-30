import React, { useEffect, useState, useRef } from "react";
import { resumeService, formatMatchErrorMessage } from "@/services/resume.service";
import { ResumeAnalysis, ResumeMatchResponse, ResumeRecord } from "@/types/resume.types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { AiResumeStudio } from "@/components/resume/AiResumeStudio";
import { ResumeVersionStudio } from "@/components/resume/ResumeVersionStudio";
import {
  Sparkles,
  CheckCircle,
  Zap,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  X,
  Layers,
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
  Pencil,
  Check,
} from "lucide-react";

export const ResumeAnalyticsPage: React.FC = () => {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Parsing & Analysis state
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysis | null>(null);
  const [analysisModalLoading, setAnalysisModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "raw">("sections");

  // Studio Mode: AI Tailoring vs Versioning & PDF vs ATS Scanner
  const [activeStudioMode, setActiveStudioMode] = useState<"ai" | "versions" | "ats">("ai");

  // ATS Keyword Scanner state
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescriptionInput, setJobDescriptionInput] = useState<string>("");
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<ResumeMatchResponse | null>(null);
  const [matchFilter, setMatchFilter] = useState<"all" | "matched" | "undetected">("all");

  const loadData = async () => {
    setResumesLoading(true);
    setError(null);
    try {
      const resumesData = await resumeService.listResumes();
      setResumes(resumesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resume documents");
    } finally {
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

  const startRenaming = (resume: ResumeRecord) => {
    setRenamingId(resume.id);
    setRenameValue(resume.originalFilename);
    setRenameError(null);
  };

  const cancelRenaming = () => {
    setRenamingId(null);
    setRenameValue("");
    setRenameError(null);
  };

  const confirmRename = async (resumeId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Filename must not be blank.");
      return;
    }
    if (trimmed.length > 255) {
      setRenameError("Filename must be 255 characters or fewer.");
      return;
    }
    if (/[/\\<>:"|?*]/.test(trimmed) || trimmed.startsWith(".")) {
      setRenameError("Filename contains invalid characters.");
      return;
    }

    setRenameLoading(true);
    setRenameError(null);
    try {
      const updated = await resumeService.renameResume(resumeId, trimmed);
      setResumes((prev) => prev.map((r) => (r.id === resumeId ? { ...r, originalFilename: updated.originalFilename } : r)));
      setSuccessMessage(`Renamed to "${updated.originalFilename}".`);
      setRenamingId(null);
      setRenameValue("");
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Rename failed. Please try again.");
    } finally {
      setRenameLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Resume Intelligence & ATS Studio
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload your resume, extract structured sections, tailor your content with AI, and export ATS-friendly PDFs.
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

      {/* 5-Step Workflow Visual Progress */}
      <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/[0.03] via-purple-500/[0.02] to-transparent shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Resume Optimization Workflow
            </span>
            <span className="text-[11px] text-muted-foreground">
              {resumes.length === 0
                ? "Step 1 of 5: Upload your resume to begin"
                : parsedResumes.length === 0
                ? "Step 2 of 5: Extract sections from uploaded resume"
                : "Step 3 of 5: Choose a tool to optimize or export"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            {/* Step 1 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                resumes.length > 0
                  ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                  : "border-primary bg-primary/5 text-foreground font-medium ring-1 ring-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    resumes.length > 0
                      ? "bg-emerald-500 text-white"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {resumes.length > 0 ? "✓" : "1"}
                </span>
                <span className="font-semibold text-xs">1. Upload Resume</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {resumes.length > 0
                  ? `${resumes.length} document${resumes.length > 1 ? "s" : ""} uploaded`
                  : "Upload PDF or DOCX file"}
              </p>
            </div>

            {/* Step 2 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                parsedResumes.length > 0
                  ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                  : resumes.length > 0
                  ? "border-amber-500/40 bg-amber-500/5 text-foreground font-medium ring-1 ring-amber-500/30"
                  : "border-border bg-muted/20 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    parsedResumes.length > 0
                      ? "bg-emerald-500 text-white"
                      : resumes.length > 0
                      ? "bg-amber-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {parsedResumes.length > 0 ? "✓" : "2"}
                </span>
                <span className="font-semibold text-xs">2. Extract Content</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {parsedResumes.length > 0
                  ? `${parsedResumes.length} parsed & ready`
                  : resumes.length > 0
                  ? "Click Parse Resume below"
                  : "Extract text & sections"}
              </p>
            </div>

            {/* Step 3 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                parsedResumes.length > 0
                  ? "border-indigo-500/30 bg-indigo-500/5 text-foreground font-medium"
                  : "border-border bg-muted/20 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    parsedResumes.length > 0
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </span>
                <span className="font-semibold text-xs">3. Choose Tool</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                AI Tailoring, Versions, or ATS
              </p>
            </div>

            {/* Step 4 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                parsedResumes.length > 0 && (matchResult || activeStudioMode === "ai")
                  ? "border-indigo-500/30 bg-indigo-500/5 text-foreground"
                  : "border-border bg-muted/20 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                  4
                </span>
                <span className="font-semibold text-xs">4. Review Results</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                AI feedback or keyword gaps
              </p>
            </div>

            {/* Step 5 */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                parsedResumes.length > 0 && activeStudioMode === "versions"
                  ? "border-indigo-500/30 bg-indigo-500/5 text-foreground"
                  : "border-border bg-muted/20 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                  5
                </span>
                <span className="font-semibold text-xs">5. Save & Export</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Save version or export PDF
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* State-Adaptive Guidance Banner */}
      {!resumesLoading && resumes.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 text-xs">
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-foreground text-sm">Step 1: Upload your master resume</h4>
            <p className="text-muted-foreground leading-relaxed">
              Upload your resume in PDF or DOCX format using the box below. Once uploaded, click <strong>"Parse Resume"</strong> to extract your skills and experience. This unlocks AI tailoring, versioning, and ATS keyword scanning.
            </p>
          </div>
        </div>
      )}

      {!resumesLoading && resumes.length > 0 && parsedResumes.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground text-sm">Step 2: Extract text to enable tools</h4>
              <p className="text-muted-foreground leading-relaxed">
                Your resume file is uploaded, but its sections must be extracted before AI tailoring, versions, or ATS analysis can run. Click <strong>"Parse Resume"</strong> on your uploaded document below to begin.
              </p>
            </div>
          </div>
          <Button
            variant="brand"
            size="sm"
            isLoading={parsingId === resumes[0]?.id}
            onClick={() => handleParseResume(resumes[0]?.id)}
            className="shrink-0 gap-1.5 shadow-sm"
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Parse Resume Now</span>
          </Button>
        </div>
      )}

      {!resumesLoading && parsedResumes.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 px-4 py-2.5 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-muted-foreground">
              Ready for optimization: <strong className="text-foreground">{parsedResumes.find((r) => r.id === targetResumeId)?.originalFilename || parsedResumes[0].originalFilename}</strong>
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Choose a tool below to tailor content with AI, create versions, or scan ATS keywords.
          </span>
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
                      <div className="min-w-0 flex-1">
                        {renamingId === resume.id ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                autoFocus
                                type="text"
                                value={renameValue}
                                onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void confirmRename(resume.id);
                                  if (e.key === "Escape") cancelRenaming();
                                }}
                                disabled={renameLoading}
                                maxLength={255}
                                className="h-7 flex-1 min-w-0 rounded-md border border-input bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                aria-label="New filename"
                              />
                              <button
                                onClick={() => void confirmRename(resume.id)}
                                disabled={renameLoading}
                                className="h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                title="Confirm rename"
                              >
                                {renameLoading ? (
                                  <span className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin inline-block" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={cancelRenaming}
                                disabled={renameLoading}
                                className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                                title="Cancel rename"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {renameError && (
                              <p className="text-[11px] text-destructive">{renameError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group/name min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate max-w-sm">
                              {resume.originalFilename}
                            </p>
                            <button
                              onClick={() => startRenaming(resume)}
                              className="opacity-0 group-hover/name:opacity-100 focus:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-opacity"
                              title="Rename"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
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
      {/* FEATURE TABS: TAILOR WITH AI | RESUME VERSIONS & PDF | ATS KEYWORD SCANNER */}
      {/* ========================================================================= */}
      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Resume Studio Tools
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a specialized tool to tailor your content, manage versions, or scan ATS keyword fit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border shrink-0">
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
              <span>Tailor Resume with AI</span>
            </button>
            <button
              type="button"
              id="tab-resume-versions"
              onClick={() => setActiveStudioMode("versions")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeStudioMode === "versions"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Resume Versions & PDF</span>
            </button>
            <button
              type="button"
              id="tab-ats-scanner"
              onClick={() => setActiveStudioMode("ats")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeStudioMode === "ats"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>ATS Keyword Scanner</span>
            </button>
          </div>
        </div>

        {/* Short, plain-language description explaining current tab */}
        <div className="rounded-lg bg-muted/40 border border-border/60 px-3.5 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            {activeStudioMode === "ai" &&
              "Tailor Resume with AI: Generate evidence-based summary rewrites, quantifiable bullet points, and customized skills for a specific job description."}
            {activeStudioMode === "versions" &&
              "Resume Versions & PDF: Create and edit tailored variations of your resume, compare line-by-line differences, and export ATS-friendly formatted PDFs."}
            {activeStudioMode === "ats" &&
              "ATS Keyword Scanner: Compare your resume against a target job posting to scan for keyword matches, compute your ATS fit score, and identify missing technical skills."}
          </span>
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
      ) : activeStudioMode === "versions" ? (
        <ResumeVersionStudio
          parsedResumes={parsedResumes}
          targetResumeId={targetResumeId}
          onSelectResumeId={setSelectedResumeId}
          formatFileSize={formatFileSize}
          onSwitchToAiStudio={() => setActiveStudioMode("ai")}
        />
      ) : (
        /* ATS KEYWORD SCANNER & MATCHING WORKFLOW */
        <Card className="border-indigo-500/40 shadow-sm">
          <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>ATS Keyword Scanner</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Evaluate your parsed resume against a target job description to compute your ATS keyword fit score and identify qualification gaps.
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

            {/* Job Description Required Prompt when empty */}
            {jobDescriptionInput.trim().length === 0 && (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  ATS keyword scanning requires a target job description. Paste the job requirements below or click <strong>"Load Sample Job Posting"</strong> to test with an example role.
                </span>
              </div>
            )}

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
                Scan ATS Keywords
              </Button>
            </div>
          </form>

          {/* Results Panel */}
          {matchResult && (
            <div className="space-y-6 pt-4 border-t border-border animate-in fade-in-50">
              {/* Score Display & Components Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Main ATS Score Card */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      ATS Keyword Match Score
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
    </div>
  );
};
