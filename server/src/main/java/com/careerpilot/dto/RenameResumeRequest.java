package com.careerpilot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for renaming a resume's display filename.
 * Rejects path traversal characters and enforces a 255-char limit.
 */
public record RenameResumeRequest(

        @NotBlank(message = "Filename must not be blank")
        @Size(max = 255, message = "Filename must not exceed 255 characters")
        @Pattern(
                regexp = "^[^/\\\\<>:\"\\|?*\\.]{1}[^/\\\\<>:\"\\|?*]*$",
                message = "Filename contains invalid characters"
        )
        String filename
) {}

