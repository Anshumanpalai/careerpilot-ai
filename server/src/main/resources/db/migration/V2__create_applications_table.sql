-- V2__create_applications_table.sql: Job Applications schema
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    job_title VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'APPLIED',
    location VARCHAR(150),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'REMOTE',
    job_url VARCHAR(500),
    salary_range VARCHAR(100),
    applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    match_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_status ON job_applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_applied_date ON job_applications (user_id, applied_date);
