import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resumeService, formatMatchErrorMessage } from "@/services/resume.service";
import {
  ResumeImprovementResponse,
  ResumeRecord,
  ResumeVersion,
  ResumeVersionComparison,
} from "@/types/resume.types";
import {
  Copy,
  Plus,
  RotateCcw,
  Trash2,
  Download,
  FileText,
  Check,
  AlertCircle,
  Save,
  GitCompare,
  Layers,
  Sparkles,
  X,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Code2,
  Award,
} from "lucide-react";

interface ResumeVersionStudioProps {
  parsedResumes: ResumeRecord[];
  targetResumeId: string;
  onSelectResumeId: (id: string) => void;
  formatFileSize: (bytes: number) => string;
  onSwitchToAiStudio?: () => void;
}

export const ResumeVersionStudio: React.FC<ResumeVersionStudioProps> = ({
  parsedResumes,
  targetResumeId,
  onSelectResumeId,
  formatFileSize,
  onSwitchToAiStudio,
}) => {
  // Versions list state
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [activeVersion, setActiveVersion] = useState<ResumeVersion | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form edit state
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formEducation, setFormEducation] = useState("");
  const [formProjects, setFormProjects] = useState("");
  const [formCustom, setFormCustom] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active section tab in editor
  const [activeEditorTab, setActiveEditorTab] = useState<
    "summary" | "skills" | "experience" | "education" | "projects" | "custom"
  >("summary");

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionRole, setNewVersionRole] = useState("");
  const [newVersionCompany, setNewVersionCompany] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [dupName, setDupName] = useState("");
  const [dupRole, setDupRole] = useState("");
  const [dupCompany, setDupCompany] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreName, setRestoreName] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Comparison state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareTargetId, setCompareTargetId] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ResumeVersionComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // AI Suggestions Drawer
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [latestAiSuggestions, setLatestAiSuggestions] = useState<ResumeImprovementResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [appliedSuggestionKeys, setAppliedSuggestionKeys] = useState<Record<string, boolean>>({});

  // Export PDF state
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Clear notices after 4s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const populateForm = useCallback((version: ResumeVersion) => {
    setActiveVersion(version);
    setFormName(version.versionName || "");
    setFormRole(version.targetRole || "");
    setFormCompany(version.targetCompany || "");
    setFormSummary(version.summary || "");
    setFormSkills(version.skills || "");
    setFormExperience(version.experience || "");
    setFormEducation(version.education || "");
    setFormProjects(version.projects || "");
    setFormCustom(version.customSections || "");
    setIsDirty(false);
  }, []);

  // Load versions for selected resume
  const fetchVersions = useCallback(async (resumeId: string, preferredVersionId?: string) => {
    if (!resumeId) return;
    setIsLoadingVersions(true);
    setError(null);
    try {
      const list = await resumeService.listVersions(resumeId);
      setVersions(list);

      if (list.length > 0) {
        let toSelect = list[0];
        if (preferredVersionId) {
          const match = list.find((v) => v.id === preferredVersionId);
          if (match) toSelect = match;
        }
        setSelectedVersionId(toSelect.id);
        populateForm(toSelect);
      } else {
        setActiveVersion(null);
        setSelectedVersionId("");
      }
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsLoadingVersions(false);
    }
  }, [populateForm]);

  useEffect(() => {
    if (targetResumeId) {
      fetchVersions(targetResumeId);
    }
  }, [targetResumeId, fetchVersions]);

  // Load latest AI recommendations
  useEffect(() => {
    if (targetResumeId) {
      setIsLoadingAi(true);
      resumeService.getLatestImprovement(targetResumeId)
        .then((res) => {
          setLatestAiSuggestions(res);
        })
        .finally(() => {
          setIsLoadingAi(false);
        });
    }
  }, [targetResumeId]);

  const handleSelectVersion = (id: string) => {
    if (isDirty) {
      const confirmLeave = window.confirm("You have unsaved changes in your current draft. Switch version anyway?");
      if (!confirmLeave) return;
    }
    const version = versions.find((v) => v.id === id);
    if (version) {
      setSelectedVersionId(id);
      populateForm(version);
    }
  };

  // Live word/char calculation for active text
  const liveWordCount = [
    formSummary,
    formSkills,
    formExperience,
    formEducation,
    formProjects,
    formCustom,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const liveCharCount = [
    formSummary,
    formSkills,
    formExperience,
    formEducation,
    formProjects,
    formCustom,
  ]
    .filter(Boolean)
    .join("\n").length;

  // Save changes to current version
  const handleSave = async () => {
    if (!targetResumeId || !activeVersion) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await resumeService.updateVersion(targetResumeId, activeVersion.id, {
        versionName: formName,
        targetRole: formRole,
        targetCompany: formCompany,
        summary: formSummary,
        skills: formSkills,
        experience: formExperience,
        education: formEducation,
        projects: formProjects,
        customSections: formCustom,
      });

      setVersions((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      populateForm(updated);
      setSuccessMessage(`Version "${updated.versionName}" saved successfully.`);
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Create new version
  const handleCreateNew = async () => {
    if (!targetResumeId) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await resumeService.createVersion(targetResumeId, {
        versionName: newVersionName.trim() || `v${versions.length + 1} - Draft`,
        targetRole: newVersionRole.trim() || undefined,
        targetCompany: newVersionCompany.trim() || undefined,
        summary: formSummary,
        skills: formSkills,
        experience: formExperience,
        education: formEducation,
        projects: formProjects,
        customSections: formCustom,
      });

      setShowNewModal(false);
      setNewVersionName("");
      setNewVersionRole("");
      setNewVersionCompany("");
      await fetchVersions(targetResumeId, created.id);
      setSuccessMessage(`New version "${created.versionName}" created.`);
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  // Duplicate active version
  const handleDuplicate = async () => {
    if (!targetResumeId || !activeVersion) return;
    setIsDuplicating(true);
    setError(null);
    try {
      const cloned = await resumeService.duplicateVersion(targetResumeId, activeVersion.id, {
        newVersionName: dupName.trim() || undefined,
        targetRole: dupRole.trim() || undefined,
        targetCompany: dupCompany.trim() || undefined,
      });

      setShowDuplicateModal(false);
      setDupName("");
      setDupRole("");
      setDupCompany("");
      await fetchVersions(targetResumeId, cloned.id);
      setSuccessMessage(`Duplicated version "${cloned.versionName}" created.`);
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsDuplicating(false);
    }
  };

  // Restore active version
  const handleRestore = async () => {
    if (!targetResumeId || !activeVersion) return;
    setIsRestoring(true);
    setError(null);
    try {
      const restored = await resumeService.restoreVersion(targetResumeId, activeVersion.id, {
        newVersionName: restoreName.trim() || undefined,
      });

      setShowRestoreModal(false);
      setRestoreName("");
      await fetchVersions(targetResumeId, restored.id);
      setSuccessMessage(
        `Restored version created as "${restored.versionName}". All past versions remain completely intact.`
      );
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete active version
  const handleDelete = async () => {
    if (!targetResumeId || !activeVersion) return;
    setIsDeleting(true);
    setError(null);
    try {
      await resumeService.deleteVersion(targetResumeId, activeVersion.id);
      setShowDeleteModal(false);
      setSuccessMessage(`Version "${activeVersion.versionName}" deleted.`);
      await fetchVersions(targetResumeId);
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Run comparison
  const handleRunComparison = async () => {
    if (!targetResumeId || !activeVersion || !compareTargetId) return;
    setIsComparing(true);
    setError(null);
    try {
      const result = await resumeService.compareVersions(targetResumeId, activeVersion.id, compareTargetId);
      setComparisonResult(result);
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsComparing(false);
    }
  };

  // Apply AI Suggestion
  const handleApplyAiSuggestion = async (
    key: string,
    type: "SUMMARY" | "BULLET" | "SKILL",
    textToApply: string,
    targetSection: string,
    action: "REPLACE" | "APPEND" = "REPLACE",
    originalText?: string
  ) => {
    if (!targetResumeId || !activeVersion) return;
    try {
      const updated = await resumeService.applyAiSuggestion(targetResumeId, activeVersion.id, {
        suggestionType: type,
        textToApply,
        targetSection,
        action,
        originalText,
      });

      populateForm(updated);
      setVersions((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setAppliedSuggestionKeys((prev) => ({ ...prev, [key]: true }));
      setSuccessMessage(`Applied AI recommendation to ${targetSection} section.`);
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    }
  };

  // Export ATS PDF
  const handleExportPdf = async () => {
    if (!targetResumeId || !activeVersion) return;
    setIsExportingPdf(true);
    setError(null);
    try {
      const safeRole = activeVersion.targetRole
        ? activeVersion.targetRole.replace(/[^a-zA-Z0-9_-]/g, "_")
        : "Resume";
      const safeVersion = activeVersion.versionName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeRole}_${safeVersion}_ATS.pdf`;

      await resumeService.exportVersionPdf(targetResumeId, activeVersion.id, filename);
      setSuccessMessage(`Exported ATS PDF for "${activeVersion.versionName}".`);
    } catch (err) {
      setError(formatMatchErrorMessage(err));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Alert Banners */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-destructive/10 border border-destructive/30 p-3.5 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4 hover:opacity-80" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4 hover:opacity-80" />
          </button>
        </div>
      )}

      {/* Target Resume & Version Switcher Card */}
      <Card className="border-indigo-500/30 bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base font-bold">Resume Version Studio</CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Maintain independently editable resume variations tailored for target roles. Original upload is preserved untouched.
              </CardDescription>
            </div>

            {/* Document Picker Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Document:</span>
              <select
                value={targetResumeId}
                onChange={(e) => onSelectResumeId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {parsedResumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.originalFilename} ({formatFileSize(r.fileSize)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Version Selection Strip & Actions Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            {/* Version dropdown selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                <span>Active Version:</span>
              </span>

              {isLoadingVersions ? (
                <span className="text-xs text-muted-foreground italic">Loading versions...</span>
              ) : versions.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">No versions found.</span>
              ) : (
                <div className="relative">
                  <select
                    id="version-switcher-select"
                    value={selectedVersionId}
                    onChange={(e) => handleSelectVersion(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-8 cursor-pointer"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber}: {v.versionName} {v.isBaseVersion ? "(Base)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Version Badges */}
              {activeVersion && (
                <div className="flex items-center gap-1.5 ml-1">
                  {activeVersion.isBaseVersion ? (
                    <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Base Baseline
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Draft Version
                    </Badge>
                  )}
                  {activeVersion.parentVersionNumber && (
                    <span className="text-[10px] text-muted-foreground">
                      (from v{activeVersion.parentVersionNumber})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewVersionName(`v${versions.length + 1} - Tailored Draft`);
                  setNewVersionRole(activeVersion?.targetRole || "");
                  setNewVersionCompany(activeVersion?.targetCompany || "");
                  setShowNewModal(true);
                }}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Version</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!activeVersion}
                onClick={() => {
                  if (activeVersion) {
                    setDupName(`Copy of ${activeVersion.versionName}`);
                    setDupRole(activeVersion.targetRole || "");
                    setDupCompany(activeVersion.targetCompany || "");
                    setShowDuplicateModal(true);
                  }
                }}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Duplicate</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!activeVersion}
                onClick={() => {
                  if (activeVersion) {
                    setRestoreName(`Restored from v${activeVersion.versionNumber}`);
                    setShowRestoreModal(true);
                  }
                }}
                className="h-8 text-xs font-semibold gap-1.5"
                title="Restores this version as a new draft, keeping history immutable"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore as New</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={versions.length < 2 || !activeVersion}
                onClick={() => {
                  const other = versions.find((v) => v.id !== activeVersion?.id);
                  if (other) setCompareTargetId(other.id);
                  setComparisonResult(null);
                  setShowCompareModal(true);
                }}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <GitCompare className="h-3.5 w-3.5 text-indigo-500" />
                <span>Compare</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAiDrawer(!showAiDrawer)}
                className={`h-8 text-xs font-semibold gap-1.5 ${
                  showAiDrawer ? "bg-primary/10 border-primary text-primary" : ""
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>AI Suggestions</span>
                {latestAiSuggestions && (
                  <Badge variant="purple" className="text-[9px] px-1 py-0 ml-0.5">
                    Available
                  </Badge>
                )}
              </Button>

              <Button
                size="sm"
                disabled={!activeVersion || isExportingPdf}
                onClick={handleExportPdf}
                className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isExportingPdf ? "Generating PDF..." : "Export ATS PDF"}</span>
              </Button>

              {activeVersion && !activeVersion.isBaseVersion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                  title="Delete this version"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* AI Suggestions Drawer (Collapsible) */}
          {showAiDrawer && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    AI Suggestions Drawer
                  </span>
                  <Badge variant="purple" className="text-[10px] px-1.5 py-0">
                    Truthful & Verified
                  </Badge>
                </div>
                <button
                  onClick={() => setShowAiDrawer(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isLoadingAi ? (
                <p className="text-xs text-muted-foreground italic">Checking latest suggestions...</p>
              ) : !latestAiSuggestions ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">
                    No AI improvement report found for this resume yet. Run "Tailor Resume with AI" to generate verified bullet improvements, professional summaries, and evidenced skills.
                  </p>
                  {onSwitchToAiStudio && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onSwitchToAiStudio}
                      className="text-xs font-semibold shrink-0 gap-1"
                    >
                      <span>Open AI Studio</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {/* Summary Suggestion */}
                  {latestAiSuggestions.improvedSummary?.suggested && (
                    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Optimized Executive Summary</span>
                        </span>
                        <Button
                          size="sm"
                          variant={appliedSuggestionKeys["summary"] ? "secondary" : "outline"}
                          disabled={appliedSuggestionKeys["summary"]}
                          onClick={() =>
                            handleApplyAiSuggestion(
                              "summary",
                              "SUMMARY",
                              latestAiSuggestions.improvedSummary.suggested,
                              "summary",
                              "REPLACE"
                            )
                          }
                          className="h-6 text-[11px] px-2 font-semibold gap-1 text-emerald-700 dark:text-emerald-300"
                        >
                          {appliedSuggestionKeys["summary"] ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Applied</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <span>Apply to Summary</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed bg-muted/40 p-2 rounded-md font-sans">
                        {latestAiSuggestions.improvedSummary.suggested}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">
                        Rationale: {latestAiSuggestions.improvedSummary.rationale}
                      </p>
                    </div>
                  )}

                  {/* Bullet Point Suggestions */}
                  {latestAiSuggestions.bulletPointSuggestions?.map((bullet, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-primary" />
                          <span>Experience Bullet #{idx + 1}</span>
                        </span>
                        <Button
                          size="sm"
                          variant={appliedSuggestionKeys[`bullet_${idx}`] ? "secondary" : "outline"}
                          disabled={appliedSuggestionKeys[`bullet_${idx}`]}
                          onClick={() =>
                            handleApplyAiSuggestion(
                              `bullet_${idx}`,
                              "BULLET",
                              bullet.suggested,
                              "experience",
                              "REPLACE",
                              bullet.original
                            )
                          }
                          className="h-6 text-[11px] px-2 font-semibold gap-1 text-primary"
                        >
                          {appliedSuggestionKeys[`bullet_${idx}`] ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Applied</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <span>Apply Bullet</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="line-through text-muted-foreground text-[11px]">{bullet.original}</p>
                        <p className="text-foreground/90 font-medium bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-md">
                          {bullet.suggested}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Rationale: {bullet.rationale}
                      </p>
                    </div>
                  ))}

                  {/* Evidenced Skills Suggestions */}
                  {latestAiSuggestions.evidencedSkills?.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Evidenced Skills to Incorporate</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {latestAiSuggestions.evidencedSkills.map((sk, sIdx) => (
                          <button
                            key={sIdx}
                            disabled={appliedSuggestionKeys[`skill_${sk.skill}`]}
                            onClick={() =>
                              handleApplyAiSuggestion(
                                `skill_${sk.skill}`,
                                "SKILL",
                                sk.skill,
                                "skills",
                                "APPEND"
                              )
                            }
                            className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                              appliedSuggestionKeys[`skill_${sk.skill}`]
                                ? "bg-muted text-muted-foreground border-border cursor-default"
                                : "bg-card border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer"
                            }`}
                            title={sk.evidenceSnippet ? `Evidence: ${sk.evidenceSnippet}` : "Add to Skills"}
                          >
                            <span>+ {sk.skill}</span>
                            {appliedSuggestionKeys[`skill_${sk.skill}`] && (
                              <Check className="h-2.5 w-2.5 text-emerald-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Version Form Editor */}
          {activeVersion ? (
            <div className="space-y-4">
              {/* Version Identity Header Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-card">
                <div>
                  <Label htmlFor="version-name" className="text-xs font-semibold">
                    Version Label
                  </Label>
                  <Input
                    id="version-name"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. v2 - Staff Backend Specialist"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="target-role" className="text-xs font-semibold">
                    Target Role
                  </Label>
                  <Input
                    id="target-role"
                    value={formRole}
                    onChange={(e) => {
                      setFormRole(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. Senior Distributed Systems Engineer"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="target-company" className="text-xs font-semibold">
                    Target Company
                  </Label>
                  <Input
                    id="target-company"
                    value={formCompany}
                    onChange={(e) => {
                      setFormCompany(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. Google, Stripe, Netflix"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Editor Tabs & Live Word Count Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: "summary", label: "Summary", icon: FileText },
                    { id: "skills", label: "Skills", icon: Code2 },
                    { id: "experience", label: "Experience", icon: Briefcase },
                    { id: "education", label: "Education", icon: GraduationCap },
                    { id: "projects", label: "Projects", icon: FolderGit2 },
                    { id: "custom", label: "Certifications & Custom", icon: Award },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeEditorTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveEditorTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Live Stats & Save Button */}
                <div className="flex flex-wrap items-center gap-3">
                  {isDirty ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Unsaved edits
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{liveWordCount} words</span>
                    <span>•</span>
                    <span>{liveCharCount} characters</span>
                  </div>

                  <Button
                    size="sm"
                    disabled={!isDirty || isSaving}
                    onClick={handleSave}
                    className="h-8 text-xs font-bold gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? "Saving..." : isDirty ? "Save Changes*" : "Saved"}</span>
                  </Button>
                </div>
              </div>

              {/* Tab Content Fields */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                {activeEditorTab === "summary" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sec-summary" className="text-xs font-bold flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>Professional Summary</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        {formSummary.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      An ATS-optimized 2-4 sentence executive overview highlighting your target specialty and verifiable accomplishments.
                    </p>
                    <textarea
                      id="sec-summary"
                      rows={5}
                      value={formSummary}
                      onChange={(e) => {
                        setFormSummary(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="High-impact distributed systems engineer with 6+ years specializing in low-latency microservices..."
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {activeEditorTab === "skills" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sec-skills" className="text-xs font-bold flex items-center gap-1.5">
                        <Code2 className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Technical & Professional Skills</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Comma-separated or bullet list
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Include relevant programming languages, frameworks, cloud infrastructure, databases, and core domain strengths.
                    </p>
                    <textarea
                      id="sec-skills"
                      rows={5}
                      value={formSkills}
                      onChange={(e) => {
                        setFormSkills(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Java 21, Spring Boot 3.4, PostgreSQL, Docker, Kubernetes, AWS, Apache Kafka, Distributed Systems"
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {activeEditorTab === "experience" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sec-experience" className="text-xs font-bold flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Work Experience</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Use bullet points with measurable impact
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Begin each bullet with active power verbs and quantify achievements with throughput, revenue, or latency metrics where verifiable.
                    </p>
                    <textarea
                      id="sec-experience"
                      rows={8}
                      value={formExperience}
                      onChange={(e) => {
                        setFormExperience(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="• Architected microservices platform handling 50,000 requests/sec with 99.99% availability&#10;• Reduced database read latency by 45% via Redis cache clustering"
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {activeEditorTab === "education" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sec-education" className="text-xs font-bold flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
                        <span>Education & Degrees</span>
                      </Label>
                    </div>
                    <textarea
                      id="sec-education"
                      rows={4}
                      value={formEducation}
                      onChange={(e) => {
                        setFormEducation(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="B.S. in Computer Science, University of Technology (2018 - 2022)"
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {activeEditorTab === "projects" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sec-projects" className="text-xs font-bold flex items-center gap-1.5">
                        <FolderGit2 className="h-3.5 w-3.5 text-purple-500" />
                        <span>Key Projects</span>
                      </Label>
                    </div>
                    <textarea
                      id="sec-projects"
                      rows={6}
                      value={formProjects}
                      onChange={(e) => {
                        setFormProjects(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="• CareerPilot AI: Full-stack career intelligence platform built with React 19 and Spring Boot"
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {activeEditorTab === "custom" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sec-custom" className="text-xs font-bold flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        <span>Certifications, Honors & Custom Sections</span>
                      </Label>
                    </div>
                    <textarea
                      id="sec-custom"
                      rows={5}
                      value={formCustom}
                      onChange={(e) => {
                        setFormCustom(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="• AWS Certified Solutions Architect Professional (2024)&#10;• Certified Kubernetes Administrator (CKA)"
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Select or create a version above to start editing.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-border bg-card shadow-2xl">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <CardTitle className="text-base font-bold">Compare Resume Versions</CardTitle>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <CardDescription className="text-xs">
                Inspect section modifications, word delta, and skill changes between two version checkpoints.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Select target version to compare with */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">Base:</span>
                  <Badge variant="outline" className="text-xs">
                    v{activeVersion?.versionNumber}: {activeVersion?.versionName}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Compare Against:</span>
                  <select
                    value={compareTargetId}
                    onChange={(e) => setCompareTargetId(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {versions
                      .filter((v) => v.id !== activeVersion?.id)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.versionNumber}: {v.versionName}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={isComparing || !compareTargetId}
                    onClick={handleRunComparison}
                    className="h-8 text-xs font-semibold"
                  >
                    {isComparing ? "Analyzing..." : "Compare"}
                  </Button>
                </div>
              </div>

              {/* Comparison Results */}
              {comparisonResult ? (
                <div className="space-y-4">
                  {/* Delta Summary Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Word Count Delta</span>
                      <p className={`text-base font-bold mt-0.5 ${
                        comparisonResult.wordCountDelta > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : comparisonResult.wordCountDelta < 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground"
                      }`}>
                        {comparisonResult.wordCountDelta > 0 ? `+${comparisonResult.wordCountDelta}` : comparisonResult.wordCountDelta} words
                      </p>
                    </div>

                    <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Character Delta</span>
                      <p className="text-base font-bold mt-0.5 text-foreground">
                        {comparisonResult.characterCountDelta > 0 ? `+${comparisonResult.characterCountDelta}` : comparisonResult.characterCountDelta} chars
                      </p>
                    </div>

                    <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Added Skills</span>
                      <p className="text-base font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                        +{comparisonResult.addedSkills?.length || 0}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Removed Skills</span>
                      <p className="text-base font-bold mt-0.5 text-rose-600 dark:text-rose-400">
                        -{comparisonResult.removedSkills?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Added/Removed Skills Badges */}
                  {((comparisonResult.addedSkills && comparisonResult.addedSkills.length > 0) ||
                    (comparisonResult.removedSkills && comparisonResult.removedSkills.length > 0)) && (
                    <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                      <span className="text-xs font-bold text-foreground">Skill Differences:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {comparisonResult.addedSkills?.map((sk, idx) => (
                          <Badge key={`add_${idx}`} variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            + {sk}
                          </Badge>
                        ))}
                        {comparisonResult.removedSkills?.map((sk, idx) => (
                          <Badge key={`rem_${idx}`} variant="secondary" className="text-[11px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            - {sk}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section-by-Section Diff Cards */}
                  {[
                    { key: "Summary", diff: comparisonResult.summaryDiff },
                    { key: "Skills", diff: comparisonResult.skillsDiff },
                    { key: "Experience", diff: comparisonResult.experienceDiff },
                    { key: "Education", diff: comparisonResult.educationDiff },
                    { key: "Projects", diff: comparisonResult.projectsDiff },
                  ].map(({ key, diff }) => (
                    <div key={key} className="rounded-lg border border-border p-3 space-y-2 bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{key}</span>
                        {diff?.isModified ? (
                          <Badge variant="purple" className="text-[10px]">
                            Modified ({diff.wordCountDelta > 0 ? `+${diff.wordCountDelta}` : diff.wordCountDelta} words)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Identical
                          </Badge>
                        )}
                      </div>

                      {diff?.isModified && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2.5">
                            <span className="text-[10px] font-bold text-rose-600 block mb-1">
                              Source (v{comparisonResult.sourceVersion.versionNumber}):
                            </span>
                            <pre className="font-sans whitespace-pre-wrap text-foreground/80 leading-relaxed text-[11px]">
                              {diff.sourceText || "(Empty)"}
                            </pre>
                          </div>

                          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                            <span className="text-[10px] font-bold text-emerald-600 block mb-1">
                              Target (v{comparisonResult.targetVersion.versionNumber}):
                            </span>
                            <pre className="font-sans whitespace-pre-wrap text-foreground/90 leading-relaxed text-[11px]">
                              {diff.targetText || "(Empty)"}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Click "Compare" above to analyze differences between v{activeVersion?.versionNumber} and the selected version.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Version Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Create New Resume Version</CardTitle>
                <button onClick={() => setShowNewModal(false)}>
                  <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <CardDescription className="text-xs">
                Creates an independent new version draft initialized with current content.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label htmlFor="new-name" className="text-xs font-semibold">
                  Version Label
                </Label>
                <Input
                  id="new-name"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="e.g. v3 - Frontend Lead"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="new-role" className="text-xs font-semibold">
                  Target Role (Optional)
                </Label>
                <Input
                  id="new-role"
                  value={newVersionRole}
                  onChange={(e) => setNewVersionRole(e.target.value)}
                  placeholder="e.g. Lead Frontend Engineer"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="new-company" className="text-xs font-semibold">
                  Target Company (Optional)
                </Label>
                <Input
                  id="new-company"
                  value={newVersionCompany}
                  onChange={(e) => setNewVersionCompany(e.target.value)}
                  placeholder="e.g. Google, Apple, Microsoft"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={isCreating} onClick={handleCreateNew}>
                  {isCreating ? "Creating..." : "Create Version"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Duplicate Version Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Duplicate Resume Version</CardTitle>
                <button onClick={() => setShowDuplicateModal(false)}>
                  <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <CardDescription className="text-xs">
                Creates a clone of v{activeVersion?.versionNumber} with lineage back to the parent version.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label htmlFor="dup-name" className="text-xs font-semibold">
                  Clone Name
                </Label>
                <Input
                  id="dup-name"
                  value={dupName}
                  onChange={(e) => setDupName(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dup-role" className="text-xs font-semibold">
                  Target Role
                </Label>
                <Input
                  id="dup-role"
                  value={dupRole}
                  onChange={(e) => setDupRole(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dup-company" className="text-xs font-semibold">
                  Target Company
                </Label>
                <Input
                  id="dup-company"
                  value={dupCompany}
                  onChange={(e) => setDupCompany(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowDuplicateModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={isDuplicating} onClick={handleDuplicate}>
                  {isDuplicating ? "Cloning..." : "Clone Version"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Restore Version Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Restore Historical Version</CardTitle>
                <button onClick={() => setShowRestoreModal(false)}>
                  <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <CardDescription className="text-xs">
                To guarantee audit safety and immutability, restoring creates a <strong>brand-new version</strong> cloned from v{activeVersion?.versionNumber} rather than overwriting existing history.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label htmlFor="restore-name" className="text-xs font-semibold">
                  Restored Version Name
                </Label>
                <Input
                  id="restore-name"
                  value={restoreName}
                  onChange={(e) => setRestoreName(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowRestoreModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={isRestoring} onClick={handleRestore}>
                  {isRestoring ? "Restoring..." : "Restore as New Version"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Version Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
          <Card className="w-full max-w-sm border-border bg-card shadow-2xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                <span>Delete Version?</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Are you sure you want to permanently delete <strong>{activeVersion?.versionName}</strong>? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
