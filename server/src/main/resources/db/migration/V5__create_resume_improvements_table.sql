-- V5__create_resume_improvements_table.sql: AI-Powered Resume Improvements schema
CREATE TABLE IF NOT EXISTS resume_improvements (
    id UUID PRIMARY KEY,
    resume_id UUID NOT NULL,
    user_id UUID NOT NULL,
    target_role VARCHAR(150),
    provider_name VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    improved_summary TEXT,
    summary_rationale TEXT,
    bullet_suggestions_json TEXT,
    evidenced_skills_json TEXT,
    learning_gaps_json TEXT,
    recommendations_json TEXT,
    learning_roadmap_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resume_improvements_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    CONSTRAINT fk_resume_improvements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resume_improvements_resume_id ON resume_improvements (resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_improvements_user_id ON resume_improvements (user_id);
CREATE INDEX IF NOT EXISTS idx_resume_improvements_created_at ON resume_improvements (created_at);
