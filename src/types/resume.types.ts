export type ResumeStatus = "UPLOADED" | "PARSED" | "FAILED";

export interface ResumeRecord {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  status: ResumeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeSections {
  skills?: string | null;
  experience?: string | null;
  education?: string | null;
  projects?: string | null;
}

export interface ResumeAnalysis {
  id: string;
  originalFilename: string;
  status: ResumeStatus;
  rawText?: string | null;
  sections?: ResumeSections;
  parsingError?: string | null;
  parsedAt?: string | null;
  createdAt: string;
}

export type RequirementTier = "REQUIRED" | "PREFERRED";

export interface SkillMatch {
  skillName: string;
  category: string;
  requirementType: RequirementTier;
  matched: boolean;
  snippet?: string | null;
}

export interface ScoreBreakdown {
  overallScore: number;
  requiredMatchRate: number;
  preferredMatchRate: number;
  matchedRequiredCount: number;
  totalRequiredCount: number;
  matchedPreferredCount: number;
  totalPreferredCount: number;
  formulaExplanation: string;
  limitations: string[];
}

export interface ResumeMatchResponse {
  resumeId: string;
  jobDescriptionLength: number;
  matchScore: number;
  scoringBreakdown: ScoreBreakdown;
  matchedSkills: SkillMatch[];
  undetectedSkills: SkillMatch[];
  recommendations: string[];
  analyzedAt: string;
}

export interface ResumeMatchRequest {
  jobDescription: string;
}

// Phase 5: AI-Powered Resume Improvement & Recommendations
export interface SummaryImprovement {
  original: string;
  suggested: string;
  rationale: string;
}

export interface BulletSuggestion {
  original: string;
  suggested: string;
  rationale: string;
  requiresUserEvidence: boolean;
  evidencePrompt?: string;
}

export interface EvidencedSkill {
  skill: string;
  category: string;
  evidenceSnippet?: string;
}

export interface LearningGap {
  missingRequirement: string;
  importance: "REQUIRED" | "PREFERRED" | string;
  reason: string;
}

export interface PrioritizedRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW" | string;
  title: string;
  actionableAdvice: string;
}

export interface RoadmapItem {
  skill: string;
  actionSteps: string[];
  estimatedTimeToAcquire: string;
  recommendedTopics: string[];
}

export interface ResumeImprovementResponse {
  id: string;
  resumeId: string;
  targetRole?: string | null;
  providerName: string;
  modelName: string;
  improvedSummary: SummaryImprovement;
  bulletPointSuggestions: BulletSuggestion[];
  evidencedSkills: EvidencedSkill[];
  learningGaps: LearningGap[];
  prioritizedRecommendations: PrioritizedRecommendation[];
  learningRoadmap: RoadmapItem[];
  complianceNotice: string;
  createdAt: string;
}

export interface ResumeImprovementRequest {
  jobDescription: string;
  userConsent: boolean;
  targetRole?: string;
}

