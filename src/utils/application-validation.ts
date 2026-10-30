export interface ApplicationFormData {
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
}

export interface ApplicationFormErrors {
  company?: string;
  title?: string;
  jobUrl?: string;
}

export function validateApplicationForm(data: ApplicationFormData): {
  isValid: boolean;
  errors: ApplicationFormErrors;
} {
  const errors: ApplicationFormErrors = {};
  if (!data.companyName || !data.companyName.trim()) {
    errors.company = "Company name is required";
  }
  if (!data.jobTitle || !data.jobTitle.trim()) {
    errors.title = "Job title is required";
  }
  if (data.jobUrl && data.jobUrl.trim()) {
    try {
      const url = new URL(data.jobUrl.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.jobUrl = "Please enter a valid HTTP or HTTPS URL";
      }
    } catch {
      errors.jobUrl = "Please enter a valid URL (e.g. https://company.com/jobs/123)";
    }
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

