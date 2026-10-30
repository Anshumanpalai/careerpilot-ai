-- V6__create_resume_versions_table.sql: Independent Resume Versioning Schema
CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID PRIMARY KEY,
    resume_id UUID NOT NULL,
    user_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(150) NOT NULL,
    target_role VARCHAR(150),
    target_company VARCHAR(150),
    summary TEXT,
    skills TEXT,
    experience TEXT,
    education TEXT,
    projects TEXT,
    custom_sections TEXT,
    is_base_version BOOLEAN NOT NULL DEFAULT FALSE,
    parent_version_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resume_versions_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    CONSTRAINT fk_resume_versions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_resume_versions_parent FOREIGN KEY (parent_version_id) REFERENCES resume_versions(id) ON DELETE SET NULL,
    CONSTRAINT uk_resume_versions_resume_num UNIQUE (resume_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions (resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_user_id ON resume_versions (user_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_created_at ON resume_versions (created_at);
CREATE INDEX IF NOT EXISTS idx_resume_versions_version_number ON resume_versions (resume_id, version_number);

