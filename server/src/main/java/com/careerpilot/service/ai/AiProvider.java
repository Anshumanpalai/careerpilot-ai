package com.careerpilot.service.ai;

public interface AiProvider {

    /**
     * The unique identifying name of this provider (e.g. "openai", "groq", "gemini").
     */
    String getProviderName();

    /**
     * Checks if this provider has valid configuration and credentials.
     */
    boolean isConfigured();

    /**
     * Invokes external model with candidate resume text and target job description.
     *
     * @param resumeText candidate's parsed resume text
     * @param jobDescription target job description
     * @param targetRole optional desired job title/role
     * @return raw response containing model identifier and raw response text
     */
    AiRawResult generateImprovement(String resumeText, String jobDescription, String targetRole);
}
