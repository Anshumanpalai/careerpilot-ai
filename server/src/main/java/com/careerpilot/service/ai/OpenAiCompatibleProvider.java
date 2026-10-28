package com.careerpilot.service.ai;

import com.careerpilot.exception.AiProviderUnavailableException;
import com.careerpilot.exception.AiServiceException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Standard OpenAI-compatible AI provider (works with OpenAI, Groq, OpenRouter, vLLM, DeepSeek, etc.).
 */
public class OpenAiCompatibleProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleProvider.class);

    private final boolean enabled;
    private final String providerName;
    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OpenAiCompatibleProvider(
            boolean enabled,
            String providerName,
            String apiKey,
            String model,
            String baseUrl,
            int connectTimeoutMs,
            int readTimeoutMs,
            ObjectMapper objectMapper
    ) {
        this.enabled = enabled;
        this.providerName = (providerName != null && !providerName.isBlank()) ? providerName.trim() : "openai";
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = (model != null && !model.isBlank()) ? model.trim() : "gpt-4o-mini";
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : "https://api.openai.com/v1";
        this.connectTimeoutMs = connectTimeoutMs > 0 ? connectTimeoutMs : 10000;
        this.readTimeoutMs = readTimeoutMs > 0 ? readTimeoutMs : 30000;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(this.connectTimeoutMs);
        requestFactory.setReadTimeout(this.readTimeoutMs);

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(this.baseUrl)
                .build();
    }

    /**
     * Package-private constructor for unit testing with custom RestClient and parameters.
     */
    OpenAiCompatibleProvider(
            boolean enabled,
            String providerName,
            String apiKey,
            String model,
            String baseUrl,
            RestClient restClient,
            ObjectMapper objectMapper
    ) {
        this.enabled = enabled;
        this.providerName = (providerName != null && !providerName.isBlank()) ? providerName.trim() : "openai";
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = (model != null && !model.isBlank()) ? model.trim() : "gpt-4o-mini";
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : "https://api.openai.com/v1";
        this.connectTimeoutMs = 10000;
        this.readTimeoutMs = 30000;
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getProviderName() {
        return providerName;
    }

    @Override
    public boolean isConfigured() {
        return enabled && !apiKey.isBlank();
    }

    @Override
    public AiRawResult generateImprovement(String resumeText, String jobDescription, String targetRole) {
        if (!enabled) {
            throw new AiProviderUnavailableException(
                    "AI Resume Improvement service is currently disabled. Please contact the administrator or set AI_ENABLED=true."
            );
        }

        if (apiKey.isBlank()) {
            throw new AiProviderUnavailableException(
                    "AI Provider is enabled but no API key is configured. Please set the AI_API_KEY environment variable."
            );
        }

        String systemPrompt = AiPromptBuilder.buildSystemPrompt();
        String userPrompt = AiPromptBuilder.buildUserPrompt(resumeText, jobDescription, targetRole);

        Map<String, Object> requestPayload = new HashMap<>();
        requestPayload.put("model", model);
        requestPayload.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        requestPayload.put("temperature", 0.2);
        requestPayload.put("max_tokens", 3500);
        requestPayload.put("response_format", Map.of("type", "json_object"));

        try {
            log.info("Dispatching resume improvement request to AI provider '{}' with model '{}'", providerName, model);

            String responseBody = restClient.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null || responseBody.isBlank()) {
                throw new AiServiceException("Received empty response body from AI provider.");
            }

            JsonNode rootNode = objectMapper.readTree(responseBody);
            JsonNode choicesNode = rootNode.path("choices");
            if (!choicesNode.isArray() || choicesNode.isEmpty()) {
                throw new AiServiceException("Malformed AI response: 'choices' array is missing or empty.");
            }

            JsonNode firstChoice = choicesNode.get(0);
            JsonNode messageNode = firstChoice.path("message");
            String content = messageNode.path("content").asText(null);

            if (content == null || content.isBlank()) {
                throw new AiServiceException("AI provider returned empty content in message.");
            }

            String resolvedModel = rootNode.path("model").asText(model);
            return new AiRawResult(providerName, resolvedModel, content);

        } catch (ResourceAccessException ex) {
            log.error("AI Provider '{}' connection timed out or failed to reach host", providerName);
            throw new AiServiceException("AI service request timed out. Please try again later.", ex);
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            log.error("AI Provider '{}' returned HTTP error status {}", status);
            if (status == 401 || status == 403) {
                throw new AiProviderUnavailableException("AI provider authentication failed. Check server API key configuration.");
            } else if (status == 429) {
                throw new AiServiceException("Upstream AI provider rate limit reached. Please wait a moment and try again.");
            }
            throw new AiServiceException("AI provider returned error HTTP status " + status, ex);
        } catch (AiProviderUnavailableException | AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error communicating with AI provider '{}'", providerName);
            throw new AiServiceException("Failed to generate AI recommendations: " + ex.getMessage(), ex);
        }
    }
}
