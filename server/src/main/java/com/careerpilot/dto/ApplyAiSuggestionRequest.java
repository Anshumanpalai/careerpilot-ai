package com.careerpilot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ApplyAiSuggestionRequest(
        @NotBlank(message = "Suggestion type is required")
        @Pattern(regexp = "^(SUMMARY|BULLET|SKILL)$", message = "Suggestion type must be SUMMARY, BULLET, or SKILL")
        String suggestionType,

        @NotBlank(message = "Text to apply cannot be blank")
        @Size(max = 20000, message = "Text to apply cannot exceed 20,000 characters")
        String textToApply,

        @NotBlank(message = "Target section is required")
        @Pattern(regexp = "^(summary|skills|experience|education|projects|customSections)$", message = "Invalid target section")
        String targetSection,

        @Pattern(regexp = "^(APPEND|REPLACE|PREPEND)$", message = "Action must be APPEND, REPLACE, or PREPEND")
        String action,

        @Size(max = 20000, message = "Original text cannot exceed 20,000 characters")
        String originalText
) {}

