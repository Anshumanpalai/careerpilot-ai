import React, { useEffect, useState } from "react";
import { applicationsService } from "@/services/applications.service";
import {
  ApplicationStatus,
  EmploymentType,
  JobApplication,
} from "@/types/applications.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"appliedDate" | "matchScore" | "companyName">("appliedDate");

  // Form Drawer State (Used for both Create and Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
  const [formErrors, setFormErrors] = useState<{ company?: string; title?: string }>({});

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await applicationsService.getApplications({
        status: selectedStatus,
        query: searchQuery,
        sortBy: sortBy,
        sortOrder: "desc",
      });
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [selectedStatus, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
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

  const openCreateDrawer = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditDrawer = (app: JobApplication) => {
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
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    if (!formCompany.trim()) errors.company = "Company name is required";
    if (!formTitle.trim()) errors.title = "Job title is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingApplicationId) {
        await applicationsService.updateApplication(editingApplicationId, {
          companyName: formCompany,
          jobTitle: formTitle,
          location: formLocation || "Remote",
          employmentType: formEmploymentType,
          salaryRange: formSalary,
          jobUrl: formJobUrl,
          status: formStatus,
          appliedDate: formAppliedDate,
          notes: formNotes,
        });
        setSuccessMessage(`Updated application for ${formCompany}.`);
      } else {
        await applicationsService.createApplication({
          companyName: formCompany,
          jobTitle: formTitle,
          location: formLocation || "Remote",
          employmentType: formEmploymentType,
          salaryRange: formSalary,
          jobUrl: formJobUrl,
          status: formStatus,
          appliedDate: formAppliedDate,
          notes: formNotes,
          matchScore: null,
        });
        setSuccessMessage(`Logged application for ${formCompany}.`);
      }

      resetForm();
      setIsFormOpen(false);
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

  const handleDeleteApplication = async (id: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to remove the application for ${companyName}?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await applicationsService.deleteApplication(id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
      setSuccessMessage(`Deleted application for ${companyName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete application");
    } finally {
      setDeletingId(null);
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

  const statuses: Array<{ label: string; value: ApplicationStatus | "ALL" }> = [
    { label: "All Opportunities", value: "ALL" },
    { label: "Saved", value: "SAVED" },
    { label: "Applied", value: "APPLIED" },
    { label: "Screening", value: "SCREENING" },
    { label: "Interviewing", value: "INTERVIEWING" },
    { label: "Offers", value: "OFFER" },
    { label: "Archived", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & New Application Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Application Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track interview milestones, recruiter contacts, and job search progress.
          </p>
        </div>
        <Button
          onClick={() => {
            if (isFormOpen) {
              setIsFormOpen(false);
              resetForm();
            } else {
              openCreateDrawer();
            }
          }}
          variant="brand"
          size="sm"
          className="gap-2 shrink-0"
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{isFormOpen ? "Close Drawer" : "Log New Application"}</span>
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
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Application Drawer (Create / Edit) */}
      {isFormOpen && (
        <Card className="border-indigo-500/30 bg-card shadow-lg animate-in fade-in-50 duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold">
              {editingApplicationId ? "Edit Opportunity Details" : "Log New Target Opportunity"}
            </CardTitle>
            <CardDescription className="text-xs">
              Keep detailed logs of interview timelines, job URLs, compensation, and recruiter notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveApplication} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company" required>Company Name</Label>
                  <Input
                    id="company"
                    placeholder="e.g. OpenAI or Google"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    error={!!formErrors.company}
                  />
                  {formErrors.company && (
                    <p className="text-[11px] text-destructive">{formErrors.company}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title" required>Job Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Staff Backend Engineer"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    error={!!formErrors.title}
                  />
                  {formErrors.title && (
                    <p className="text-[11px] text-destructive">{formErrors.title}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">Location / Work Type</Label>
                  <Input
                    id="location"
                    placeholder="e.g. San Francisco, CA or Remote"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <select
                    id="employmentType"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formEmploymentType}
                    onChange={(e) => setFormEmploymentType(e.target.value as EmploymentType)}
                  >
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="FULL_TIME">Full-Time Onsite</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="PART_TIME">Part-Time</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salary">Salary Band / Target</Label>
                  <Input
                    id="salary"
                    placeholder="e.g. $210k - $260k + Equity"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="jobUrl">Job Posting URL</Label>
                  <Input
                    id="jobUrl"
                    placeholder="https://..."
                    value={formJobUrl}
                    onChange={(e) => setFormJobUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="appliedDate">Applied Date</Label>
                  <Input
                    id="appliedDate"
                    type="date"
                    value={formAppliedDate}
                    onChange={(e) => setFormAppliedDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">Current Status</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ApplicationStatus)}
                  >
                    <option value="SAVED">Saved / Preparing</option>
                    <option value="APPLIED">Applied</option>
                    <option value="SCREENING">Recruiter Screen</option>
                    <option value="INTERVIEWING">Interviewing</option>
                    <option value="OFFER">Offer Received</option>
                    <option value="REJECTED">Archived / Rejected</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Strategy & Notes</Label>
                <textarea
                  id="notes"
                  rows={2}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Recruiter names, referral details, or specific talking points..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsFormOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  {editingApplicationId ? "Update Opportunity" : "Save Opportunity"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs and Search Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {statuses.map((st) => (
            <button
              key={st.value}
              type="button"
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

        {/* Search & Sort */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search company or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="appliedDate">Sort: Newest</option>
            <option value="matchScore">Sort: ATS Fit</option>
            <option value="companyName">Sort: Company</option>
          </select>
        </form>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchApplications} />}

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
          title="No applications match your criteria"
          description={
            searchQuery
              ? `No results found for "${searchQuery}". Try modifying your search term or clearing the status filter.`
              : "You haven't logged any job opportunities in this category yet. Click below to add one."
          }
          actionLabel="Log New Application"
          onAction={openCreateDrawer}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Job & Company details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base text-foreground leading-tight">
                      {app.companyName}
                    </h3>
                    {getStatusBadge(app.status)}
                    <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {app.employmentType}
                    </span>
                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Link</span>
                      </a>
                    )}
                  </div>

                  <p className="text-sm font-medium text-foreground/90">{app.jobTitle}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
                      {app.location || "Remote"}
                    </span>
                    {app.salaryRange && (
                      <span className="font-medium text-foreground/80">• {app.salaryRange}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
                      Applied: {app.appliedDate}
                    </span>
                  </div>

                  {app.notes && (
                    <p className="text-xs text-muted-foreground/90 pt-1 line-clamp-2 italic">
                      "{app.notes}"
                    </p>
                  )}
                </div>

                {/* ATS Match, Actions & Status Quick Toggle */}
                <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="text-left md:text-right">
                    <div className="flex items-center md:justify-end gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
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
                      className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                      onClick={() => openEditDrawer(app)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Edit application"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteApplication(app.id, app.companyName)}
                      disabled={deletingId === app.id}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete application"
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
    </div>
  );
};
