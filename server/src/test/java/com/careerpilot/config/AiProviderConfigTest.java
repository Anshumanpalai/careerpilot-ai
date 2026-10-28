package com.careerpilot.config;

import com.careerpilot.service.ai.AiProvider;
import com.careerpilot.service.ai.GeminiAiProvider;
import com.careerpilot.service.ai.OpenAiCompatibleProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiProviderConfigTest {

    private final AiProviderConfig config = new AiProviderConfig();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("aiProvider creates GeminiAiProvider when provider is gemini")
    void aiProvider_Gemini_ReturnsGeminiProvider() {
        AiProvider provider = config.aiProvider(
                true,
                "gemini",
                "AIzaSyKey",
                "",
                "gemini-2.5-flash",
                "",
                "",
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider).isInstanceOf(GeminiAiProvider.class);
        assertThat(provider.getProviderName()).isEqualTo("gemini");
        assertThat(provider.isConfigured()).isTrue();
    }

    @Test
    @DisplayName("aiProvider passes fallback model correctly to GeminiAiProvider")
    void aiProvider_GeminiFallbackModel_ConfiguredCorrectly() {
        AiProvider provider = config.aiProvider(
                true,
                "gemini",
                "AIzaSyKey",
                "",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "",
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider).isInstanceOf(GeminiAiProvider.class);
        GeminiAiProvider gemini = (GeminiAiProvider) provider;
        assertThat(gemini.getModel()).isEqualTo("gemini-2.5-flash");
        assertThat(gemini.getFallbackModel()).contains("gemini-2.0-flash");
    }

    @Test
    @DisplayName("aiProvider falls back to gemini-api-key when api-key is empty")
    void aiProvider_GeminiApiKeyFallback_ConfiguredCorrectly() {
        AiProvider provider = config.aiProvider(
                true,
                "gemini",
                "",
                "AIzaSyFromGeminiEnv",
                "gemini-2.5-flash",
                "",
                "",
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider).isInstanceOf(GeminiAiProvider.class);
        assertThat(provider.isConfigured()).isTrue();
    }

    @Test
    @DisplayName("aiProvider prefers geminiApiKey over apiKey when provider is gemini")
    void aiProvider_GeminiApiKeyPrecedence_ConfiguredWithGeminiKey() {
        AiProvider provider = config.aiProvider(
                true,
                "gemini",
                "sk-dummy-openai-key",
                "AIzaSySpecificGeminiKey",
                "gemini-2.5-flash",
                "",
                "",
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider).isInstanceOf(GeminiAiProvider.class);
        assertThat(provider.isConfigured()).isTrue();
    }

    @Test
    @DisplayName("aiProvider defaults to gemini provider when providerName is null or blank")
    void aiProvider_NullOrBlankProvider_DefaultsToGemini() {
        AiProvider provider = config.aiProvider(
                true,
                "  ",
                "AIzaSyKey",
                "",
                null,
                null,
                null,
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider).isInstanceOf(GeminiAiProvider.class);
        assertThat(provider.getProviderName()).isEqualTo("gemini");
        assertThat(provider.isConfigured()).isTrue();
    }

    @Test
    @DisplayName("aiProvider isConfigured returns false when enabled is false even with key")
    void aiProvider_Disabled_NotConfigured() {
        AiProvider provider = config.aiProvider(
                false,
                "gemini",
                "AIzaSyKey",
                "",
                "gemini-2.5-flash",
                "",
                "",
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider.isConfigured()).isFalse();
    }

    @Test
    @DisplayName("aiProvider isConfigured returns false when key is blank even if enabled is true")
    void aiProvider_MissingKey_NotConfigured() {
        AiProvider provider = config.aiProvider(
                true,
                "gemini",
                "   ",
                "",
                "gemini-2.5-flash",
                "",
                "",
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider.isConfigured()).isFalse();
    }

    @Test
    @DisplayName("aiProvider creates OpenAiCompatibleProvider when provider is openai")
    void aiProvider_OpenAi_ReturnsOpenAiProvider() {
        AiProvider provider = config.aiProvider(
                true,
                "openai",
                "sk-openai-key",
                "",
                "gpt-4o-mini",
                "",
                "",
                10000,
                30000,
                3,
                1000L,
                8000L,
                objectMapper
        );

        assertThat(provider).isInstanceOf(OpenAiCompatibleProvider.class);
        assertThat(provider.getProviderName()).isEqualTo("openai");
        assertThat(provider.isConfigured()).isTrue();
    }
}
