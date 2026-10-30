import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { applicationsService } from "@/services/applications.service";
import {
  ApplicationStatus,
  EmploymentType,
  JobApplication,
} from "@/types/applications.types";
import { validateApplicationForm } from "@/utils/application-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  Sparkles,
  X,
  Trash2,
  Pencil,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Briefcase,
  DollarSign,
  Building2,
} from "lucide-react";

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("query") || "";

  // Filters & Search
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [sortBy, setSortBy] = useState<"appliedDate" | "matchScore" | "companyName">("appliedDate");

  // Synchronize searchQuery if URL param changes externally (e.g. from GlobalSearch)
  useEffect(() => {
    const q = searchParams.get("query");
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams, searchQuery]);

  // Modal Dialog State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion Confirmation Modal State
  const [deleteConfirmApp, setDeleteConfirmApp] = useState<{ id: string; companyName: string; jobTitle: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form inputs
  const [formCompany, setFormCompany] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formEmploymentType, setFormEmploymentType] = useState<EmploymentType>("REMOTE");
  const [formSalary, setFormSalary] = useState("");
  const [formJobUrl, setFormJobUrl] = useState("");
  const [formAppliedDate, setFormAppliedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<ApplicationStatus>("APPLIED");
  const [formNotes, setFormNotes] = useState("");
  const [formErrors, setFormErrors] = useState<{ company?: string; title?: string; jobUrl?: string }>({});

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await applicationsService.getApplications({
        status: selectedStatus,
        query: searchQuery.trim() || undefined,
        sortBy: sortBy,
        sortOrder: "desc",
      });
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, searchQuery, sortBy]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteConfirmApp) {
          setDeleteConfirmApp(null);
        } else if (isModalOpen && !isSubmitting) {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isSubmitting, deleteConfirmApp]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleResetFilters = () => {
    setSelectedStatus("ALL");
    setSearchQuery("");
    setSortBy("appliedDate");
    setSearchParams({});
  };

  const resetForm = () => {
    setFormCompany("");
    setFormTitle("");
    setFormLocation("");
    setFormEmploymentType("REMOTE");
    setFormSalary("");
    setFormJobUrl("");
    setFormAppliedDate(new Date().toISOString().split("T")[0]);
    setFormStatus("APPLIED");
    setFormNotes("");
    setFormErrors({});
    setEditingApplicationId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (app: JobApplication) => {
    setEditingApplicationId(app.id);
    setFormCompany(app.companyName);
    setFormTitle(app.jobTitle);
    setFormLocation(app.location || "");
    setFormEmploymentType(app.employmentType);
    setFormSalary(app.salaryRange || "");
    setFormJobUrl(app.jobUrl || "");
    setFormAppliedDate(app.appliedDate || new Date().toISOString().split("T")[0]);
    setFormStatus(app.status);
    setFormNotes(app.notes || "");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const result = validateApplicationForm({
      companyName: formCompany,
      jobTitle: formTitle,
      jobUrl: formJobUrl,
    });
    setFormErrors(result.errors);
    return result.isValid;
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingApplicationId) {
        await applicationsService.updateApplication(editingApplicationId, {
          companyName: formCompany.trim(),
          jobTitle: formTitle.trim(),
          location: formLocation.trim() || "Remote",
          employmentType: formEmploymentType,
          salaryRange: formSalary.trim() || undefined,
          jobUrl: formJobUrl.trim() || undefined,
          status: formStatus,
          appliedDate: formAppliedDate,
          notes: formNotes.trim() || undefined,
        });
        setSuccessMessage(`Updated application for ${formCompany.trim()}.`);
      } else {
        await applicationsService.createApplication({
          companyName: formCompany.trim(),
          jobTitle: formTitle.trim(),
          location: formLocation.trim() || "Remote",
          employmentType: formEmploymentType,
          salaryRange: formSalary.trim() || undefined,
          jobUrl: formJobUrl.trim() || undefined,
          status: formStatus,
          appliedDate: formAppliedDate,
          notes: formNotes.trim() || undefined,
          matchScore: null,
        });
        setSuccessMessage(`Logged application for ${formCompany.trim()}.`);
      }

      resetForm();
      setIsModalOpen(false);
      await fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: ApplicationStatus) => {
    try {
      await applicationsService.updateStatus(id, newStatus);
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
      setSuccessMessage("Application status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmApp || isDeleting) return;

    setIsDeleting(true);
    setError(null);
    try {
      await applicationsService.deleteApplication(deleteConfirmApp.id);
      setApplications((prev) => prev.filter((app) => app.id !== deleteConfirmApp.id));
      setSuccessMessage(`Deleted application for ${deleteConfirmApp.companyName}.`);
      setDeleteConfirmApp(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete application");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "OFFER":
        return <Badge variant="success">Offer</Badge>;
      case "INTERVIEWING":
        return <Badge variant="purple">Interviewing</Badge>;
      case "SCREENING":
        return <Badge variant="info">Screening</Badge>;
      case "APPLIED":
        return <Badge variant="default">Applied</Badge>;
      case "SAVED":
        return <Badge variant="secondary">Saved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
    }
  };

  // Exact 1-to-1 match with backend ApplicationStatus enum
  const statuses: Array<{ label: string; value: ApplicationStatus | "ALL" }> = [
    { label: "All Opportunities", value: "ALL" },
    { label: "Saved", value: "SAVED" },
    { label: "Applied", value: "APPLIED" },
    { label: "Screening", value: "SCREENING" },
    { label: "Interviewing", value: "INTERVIEWING" },
    { label: "Offers", value: "OFFER" },
    { label: "Rejected", value: "REJECTED" },
  ];

  const hasActiveFilters = selectedStatus !== "ALL" || searchQuery.trim() !== "" || sortBy !== "appliedDate";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Log New Application Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Application Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track interview milestones, recruiter contacts, and job search progress.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          variant="brand"
          size="sm"
          className="gap-2 shrink-0 h-9"
        >
          <Plus className="h-4 w-4" />
          <span>Log New Application</span>
        </Button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Alert with Retry */}
      {error && <ErrorAlert message={error} onRetry={fetchApplications} />}

      {/* Filter Tabs and Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none" role="tablist" aria-label="Application status filters">
            {statuses.map((st) => (
              <button
                key={st.value}
                type="button"
                role="tab"
                aria-selected={selectedStatus === st.value}
                onClick={() => setSelectedStatus(st.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === st.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search company or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search applications by company or title"
                className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort applications"
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="appliedDate">Sort: Newest Applied</option>
              <option value="matchScore">Sort: Highest ATS Fit</option>
              <option value="companyName">Sort: Company (A-Z)</option>
            </select>
          </form>
        </div>

        {/* Active Filter Indicator Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent/40 border border-border/50 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">Active Filter:</span>
              {selectedStatus !== "ALL" && (
                <Badge variant="outline" className="text-[11px] gap-1 bg-card">
                  Status: {statuses.find((s) => s.value === selectedStatus)?.label}
                </Badge>
              )}
              {searchQuery.trim() && (
                <Badge variant="outline" className="text-[11px] gap-1 bg-card">
                  Query: "{searchQuery.trim()}"
                </Badge>
              )}
              {sortBy !== "appliedDate" && (
                <Badge variant="outline" className="text-[11px] gap-1 bg-card">
                  Sorted by: {sortBy === "matchScore" ? "ATS Fit" : "Company"}
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </Button>
          </div>
        )}
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />}
          title={hasActiveFilters ? "No applications match your filters" : "Your application pipeline is empty"}
          description={
            hasActiveFilters
              ? "Try clearing your search query or switching status filters to see existing opportunities."
              : "Track your job search from application to offer. Log companies, positions, interview dates, and recruiter notes."
          }
          actionLabel={hasActiveFilters ? "Reset Filters" : "Log New Application"}
          onAction={hasActiveFilters ? handleResetFilters : openCreateModal}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Job & Company details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base text-foreground leading-tight">
                      {app.companyName}
                    </h3>
                    {getStatusBadge(app.status)}
                    <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {app.employmentType.replace("_", " ")}
                    </span>
                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
                        title="Open external job listing"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Job Posting</span>
                      </a>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-foreground/90">{app.jobTitle}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                      {app.location || "Remote"}
                    </span>
                    {app.salaryRange && (
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0 -mr-0.5" />
                        {app.salaryRange}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                      Applied: {app.appliedDate}
                    </span>
                  </div>

                  {app.notes && (
                    <div className="rounded-md bg-muted/40 border border-border/50 px-3 py-1.5 text-xs text-muted-foreground mt-1">
                      <span className="font-semibold text-foreground/80 mr-1.5">Notes:</span>
                      <span className="italic leading-relaxed">{app.notes}</span>
                    </div>
                  )}
                </div>

                {/* ATS Match & Action Controls */}
                <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="text-left md:text-right">
                    <div className="flex items-center md:justify-end gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-bold text-foreground">
                        {app.matchScore != null ? `${app.matchScore}%` : "--"}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {app.matchScore != null ? "ATS Match" : "Not Evaluated"}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusUpdate(app.id, e.target.value as ApplicationStatus)}
                      aria-label={`Change status for ${app.companyName}`}
                      className="h-8 rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="SAVED">Saved</option>
                      <option value="APPLIED">Applied</option>
                      <option value="SCREENING">Screening</option>
                      <option value="INTERVIEWING">Interviewing</option>
                      <option value="OFFER">Offer</option>
                      <option value="REJECTED">Rejected</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(app)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title={`Edit ${app.companyName} application`}
                      aria-label={`Edit ${app.companyName} application`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmApp({ id: app.id, companyName: app.companyName, jobTitle: app.jobTitle })}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title={`Delete ${app.companyName} application`}
                      aria-label={`Delete ${app.companyName} application`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-modal-title"
        >
          <div className="relative z-50 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="app-modal-title" className="text-base font-bold text-foreground">
                    {editingApplicationId ? "Edit Opportunity Details" : "Log New Target Opportunity"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Track interview timelines, salary targets, job URLs, and strategy notes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    setIsModalOpen(false);
                    resetForm();
                  }
                }}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveApplication} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="form-company" required>Company Name</Label>
                  <Input
                    id="form-company"
                    placeholder="e.g. OpenAI, Stripe, Google"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    error={!!formErrors.company}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  {formErrors.company && (
                    <p className="text-[11px] text-destructive font-medium">{formErrors.company}</p>
                  )}
                </div>

                {/* Job Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="form-title" required>Job Title</Label>
                  <Input
                    id="form-title"
                    placeholder="e.g. Senior Backend Engineer"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    error={!!formErrors.title}
                    disabled={isSubmitting}
                  />
                  {formErrors.title && (
                    <p className="text-[11px] text-destructive font-medium">{formErrors.title}</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <Label htmlFor="form-location">Location / Region</Label>
                  <Input
                    id="form-location"
                    placeholder="e.g. San Francisco, CA or Remote"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="form-employmentType">Work Arrangement</Label>
                  <select
                    id="form-employmentType"
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    value={formEmploymentType}
                    onChange={(e) => setFormEmploymentType(e.target.value as EmploymentType)}
                    disabled={isSubmitting}
                  >
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="FULL_TIME">Full-Time Onsite</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="PART_TIME">Part-Time</option>
                  </select>
                </div>

                {/* Salary Band */}
                <div className="space-y-1.5">
                  <Label htmlFor="form-salary">Salary Range / Target</Label>
                  <Input
                    id="form-salary"
                    placeholder="e.g. $180,000 - $220,000 + Equity"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Applied Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="form-appliedDate">Applied Date</Label>
                  <Input
                    id="form-appliedDate"
                    type="date"
                    value={formAppliedDate}
                    onChange={(e) => setFormAppliedDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Current Status */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="form-status">Pipeline Status</Label>
                  <select
                    id="form-status"
                    className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ApplicationStatus)}
                    disabled={isSubmitting}
                  >
                    <option value="SAVED">Saved / Preparing</option>
                    <option value="APPLIED">Applied</option>
                    <option value="SCREENING">Recruiter Screen</option>
                    <option value="INTERVIEWING">Interviewing</option>
                    <option value="OFFER">Offer Received</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Job Posting URL */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="form-jobUrl">Job Posting URL (Optional)</Label>
                  <Input
                    id="form-jobUrl"
                    type="url"
                    placeholder="https://jobs.company.com/role/12345"
                    value={formJobUrl}
                    onChange={(e) => setFormJobUrl(e.target.value)}
                    error={!!formErrors.jobUrl}
                    disabled={isSubmitting}
                  />
                  {formErrors.jobUrl && (
                    <p className="text-[11px] text-destructive font-medium">{formErrors.jobUrl}</p>
                  )}
                </div>
              </div>

              {/* Strategy & Recruiter Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="form-notes">Strategy & Notes (Optional)</Label>
                <textarea
                  id="form-notes"
                  rows={3}
                  className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y leading-relaxed"
                  placeholder="Key contacts, referral notes, specific interview dates, tech stack details..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="px-5 font-semibold"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingApplicationId
                    ? "Update Opportunity"
                    : "Save Opportunity"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="relative z-50 w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2.5 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-foreground">
                  Delete Application
                </h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              Are you sure you want to remove the application for{" "}
              <span className="font-semibold text-foreground">
                {deleteConfirmApp.companyName} ({deleteConfirmApp.jobTitle})
              </span>
              ? All saved interview stages and notes for this role will be permanently deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmApp(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                disabled={isDeleting}
                className="gap-1.5 font-semibold"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? "Deleting..." : "Delete Application"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
