package com.careerpilot.config;

import com.careerpilot.service.ai.AiProvider;
import com.careerpilot.service.ai.GeminiAiProvider;
import com.careerpilot.service.ai.OpenAiCompatibleProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring configuration factory that dynamically provisions the active AiProvider
 * (Google Gemini or OpenAI-compatible) based on application configuration.
 */
@Configuration
public class AiProviderConfig {

    private static final Logger log = LoggerFactory.getLogger(AiProviderConfig.class);

    @Bean
    public AiProvider aiProvider(
            @Value("${app.ai.enabled:false}") boolean enabled,
            @Value("${app.ai.provider:gemini}") String providerName,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.gemini-api-key:}") String geminiApiKey,
            @Value("${app.ai.model:}") String model,
            @Value("${app.ai.fallback-model:}") String fallbackModel,
            @Value("${app.ai.base-url:}") String baseUrl,
            @Value("${app.ai.connect-timeout-ms:10000}") int connectTimeoutMs,
            @Value("${app.ai.read-timeout-ms:30000}") int readTimeoutMs,
            @Value("${app.ai.max-retries:3}") int maxRetries,
            @Value("${app.ai.retry-initial-backoff-ms:1000}") long initialBackoffMs,
            @Value("${app.ai.retry-max-backoff-ms:8000}") long maxBackoffMs,
            ObjectMapper objectMapper
    ) {
        String normalizedProvider = (providerName != null && !providerName.isBlank())
                ? providerName.trim().toLowerCase()
                : "gemini";

        String effectiveKey;
        if ("gemini".equals(normalizedProvider)) {
            effectiveKey = (geminiApiKey != null && !geminiApiKey.isBlank())
                    ? geminiApiKey.trim()
                    : (apiKey != null ? apiKey.trim() : "");
        } else {
            effectiveKey = (apiKey != null && !apiKey.isBlank())
                    ? apiKey.trim()
                    : (geminiApiKey != null ? geminiApiKey.trim() : "");
        }

        log.info("Configuring AI provider '{}' (enabled={})", normalizedProvider, enabled);

        if ("gemini".equals(normalizedProvider)) {
            String geminiModel = (model != null && !model.isBlank()) ? model.trim() : GeminiAiProvider.DEFAULT_MODEL;
            String geminiFallbackModel = (fallbackModel != null && !fallbackModel.isBlank()) ? fallbackModel.trim() : null;
            String geminiBaseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : GeminiAiProvider.DEFAULT_BASE_URL;
            return new GeminiAiProvider(
                    enabled,
                    effectiveKey,
                    geminiModel,
                    geminiFallbackModel,
                    geminiBaseUrl,
                    connectTimeoutMs,
                    readTimeoutMs,
                    maxRetries,
                    initialBackoffMs,
                    maxBackoffMs,
                    objectMapper
            );
        } else {
            String openAiModel = (model != null && !model.isBlank() && !model.startsWith("gemini"))
                    ? model.trim()
                    : "gpt-4o-mini";
            String openAiBaseUrl = (baseUrl != null && !baseUrl.isBlank() && !baseUrl.contains("googleapis"))
                    ? baseUrl.trim()
                    : "https://api.openai.com/v1";
            return new OpenAiCompatibleProvider(
                    enabled,
                    normalizedProvider,
                    effectiveKey,
                    openAiModel,
                    openAiBaseUrl,
                    connectTimeoutMs,
                    readTimeoutMs,
                    objectMapper
            );
        }
    }
}
