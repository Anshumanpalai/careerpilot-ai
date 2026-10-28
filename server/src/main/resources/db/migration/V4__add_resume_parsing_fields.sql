-- V4__add_resume_parsing_fields.sql: Add resume text extraction and section fields
ALTER TABLE resumes
    ADD COLUMN IF NOT EXISTS raw_text TEXT,
    ADD COLUMN IF NOT EXISTS skills_summary TEXT,
    ADD COLUMN IF NOT EXISTS experience_summary TEXT,
    ADD COLUMN IF NOT EXISTS education_summary TEXT,
    ADD COLUMN IF NOT EXISTS projects_summary TEXT,
    ADD COLUMN IF NOT EXISTS parsing_error VARCHAR(500),
    ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE;
