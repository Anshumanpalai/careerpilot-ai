package com.careerpilot.service.ai;

import com.careerpilot.exception.AiProviderUnavailableException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenAiCompatibleProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("isConfigured returns false when enabled is false")
    void isConfigured_Disabled_ReturnsFalse() {
        OpenAiCompatibleProvider provider = new OpenAiCompatibleProvider(
                false, "openai", "sk-valid-key", "gpt-4o-mini", "https://api.openai.com/v1",
                RestClient.builder().build(), objectMapper
        );

        assertThat(provider.isConfigured()).isFalse();
    }

    @Test
    @DisplayName("isConfigured returns false when API key is blank")
    void isConfigured_BlankKey_ReturnsFalse() {
        OpenAiCompatibleProvider provider = new OpenAiCompatibleProvider(
                true, "openai", "   ", "gpt-4o-mini", "https://api.openai.com/v1",
                RestClient.builder().build(), objectMapper
        );

        assertThat(provider.isConfigured()).isFalse();
    }

    @Test
    @DisplayName("isConfigured returns true when enabled and key is present")
    void isConfigured_EnabledWithKey_ReturnsTrue() {
        OpenAiCompatibleProvider provider = new OpenAiCompatibleProvider(
                true, "openai", "sk-valid-key", "gpt-4o-mini", "https://api.openai.com/v1",
                RestClient.builder().build(), objectMapper
        );

        assertThat(provider.isConfigured()).isTrue();
        assertThat(provider.getProviderName()).isEqualTo("openai");
    }

    @Test
    @DisplayName("generateImprovement throws 503 AiProviderUnavailableException when disabled")
    void generateImprovement_Disabled_ThrowsException() {
        OpenAiCompatibleProvider provider = new OpenAiCompatibleProvider(
                false, "openai", "sk-key", "gpt-4o-mini", "https://api.openai.com/v1",
                RestClient.builder().build(), objectMapper
        );

        assertThatThrownBy(() -> provider.generateImprovement("resume text", "job description", "Backend Engineer"))
                .isInstanceOf(AiProviderUnavailableException.class)
                .hasMessageContaining("AI Resume Improvement service is currently disabled");
    }

    @Test
    @DisplayName("generateImprovement throws 503 AiProviderUnavailableException when API key is blank")
    void generateImprovement_BlankKey_ThrowsException() {
        OpenAiCompatibleProvider provider = new OpenAiCompatibleProvider(
                true, "openai", "", "gpt-4o-mini", "https://api.openai.com/v1",
                RestClient.builder().build(), objectMapper
        );

        assertThatThrownBy(() -> provider.generateImprovement("resume text", "job description", "Backend Engineer"))
                .isInstanceOf(AiProviderUnavailableException.class)
                .hasMessageContaining("no API key is configured");
    }
}
