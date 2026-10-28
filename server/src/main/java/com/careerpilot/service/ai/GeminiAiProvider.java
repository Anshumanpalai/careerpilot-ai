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

import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Dedicated Google Gemini AI provider utilizing the official Google Generative Language API.
 * Features bounded retries with exponential backoff, jitter, Retry-After header support,
 * and reliable explicitly configured fallback model failover.
 */
public class GeminiAiProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiProvider.class);

    public static final String DEFAULT_MODEL = "gemini-3.8-flash";
    public static final String DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    public static final int DEFAULT_MAX_RETRIES = 3;
    public static final long DEFAULT_INITIAL_BACKOFF_MS = 1000L;
    public static final long DEFAULT_MAX_BACKOFF_MS = 8000L;
    private static final long MAX_ALLOWED_RETRY_AFTER_MS = 60000L;

    @FunctionalInterface
    public interface BackoffSleeper {
        void sleep(long millis) throws InterruptedException;
    }

    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final String fallbackModel;
    private final String baseUrl;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;
    private final int maxRetries;
    private final long initialBackoffMs;
    private final long maxBackoffMs;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final BackoffSleeper sleeper;

    public GeminiAiProvider(
            boolean enabled,
            String apiKey,
            String model,
            String fallbackModel,
            String baseUrl,
            int connectTimeoutMs,
            int readTimeoutMs,
            int maxRetries,
            long initialBackoffMs,
            long maxBackoffMs,
            ObjectMapper objectMapper
    ) {
        this(
                enabled,
                apiKey,
                model,
                fallbackModel,
                baseUrl,
                connectTimeoutMs,
                readTimeoutMs,
                maxRetries,
                initialBackoffMs,
                maxBackoffMs,
                objectMapper,
                null,
                Thread::sleep
        );
    }

    /**
     * Backward-compatible constructor without fallbackModel or retry parameters.
     */
    public GeminiAiProvider(
            boolean enabled,
            String apiKey,
            String model,
            String baseUrl,
            int connectTimeoutMs,
            int readTimeoutMs,
            ObjectMapper objectMapper
    ) {
        this(
                enabled,
                apiKey,
                model,
                null,
                baseUrl,
                connectTimeoutMs,
                readTimeoutMs,
                DEFAULT_MAX_RETRIES,
                DEFAULT_INITIAL_BACKOFF_MS,
                DEFAULT_MAX_BACKOFF_MS,
                objectMapper
        );
    }

    /**
     * Package-private constructor for unit testing with custom RestClient, sleeper, and retry parameters.
     */
    GeminiAiProvider(
            boolean enabled,
            String apiKey,
            String model,
            String fallbackModel,
            String baseUrl,
            RestClient restClient,
            ObjectMapper objectMapper,
            int maxRetries,
            long initialBackoffMs,
            long maxBackoffMs,
            BackoffSleeper sleeper
    ) {
        this.enabled = enabled;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = (model != null && !model.isBlank()) ? model.trim() : DEFAULT_MODEL;
        this.fallbackModel = (fallbackModel != null && !fallbackModel.isBlank()) ? fallbackModel.trim() : null;
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : DEFAULT_BASE_URL;
        this.connectTimeoutMs = 10000;
        this.readTimeoutMs = 30000;
        this.maxRetries = Math.max(0, Math.min(5, maxRetries));
        this.initialBackoffMs = initialBackoffMs > 0 ? initialBackoffMs : DEFAULT_INITIAL_BACKOFF_MS;
        this.maxBackoffMs = maxBackoffMs >= this.initialBackoffMs ? maxBackoffMs : DEFAULT_MAX_BACKOFF_MS;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
        this.sleeper = sleeper != null ? sleeper : Thread::sleep;
    }

    /**
     * Internal master constructor.
     */
    private GeminiAiProvider(
            boolean enabled,
            String apiKey,
            String model,
            String fallbackModel,
            String baseUrl,
            int connectTimeoutMs,
            int readTimeoutMs,
            int maxRetries,
            long initialBackoffMs,
            long maxBackoffMs,
            ObjectMapper objectMapper,
            RestClient customRestClient,
            BackoffSleeper customSleeper
    ) {
        this.enabled = enabled;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = (model != null && !model.isBlank()) ? model.trim() : DEFAULT_MODEL;
        this.fallbackModel = (fallbackModel != null && !fallbackModel.isBlank()) ? fallbackModel.trim() : null;
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : DEFAULT_BASE_URL;
        this.connectTimeoutMs = connectTimeoutMs > 0 ? connectTimeoutMs : 10000;
        this.readTimeoutMs = readTimeoutMs > 0 ? readTimeoutMs : 30000;
        this.maxRetries = Math.max(0, Math.min(5, maxRetries));
        this.initialBackoffMs = initialBackoffMs > 0 ? initialBackoffMs : DEFAULT_INITIAL_BACKOFF_MS;
        this.maxBackoffMs = maxBackoffMs >= this.initialBackoffMs ? maxBackoffMs : DEFAULT_MAX_BACKOFF_MS;
        this.objectMapper = objectMapper;
        this.sleeper = customSleeper != null ? customSleeper : Thread::sleep;

        if (customRestClient != null) {
            this.restClient = customRestClient;
        } else {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(this.connectTimeoutMs);
            requestFactory.setReadTimeout(this.readTimeoutMs);

            this.restClient = RestClient.builder()
                    .requestFactory(requestFactory)
                    .baseUrl(this.baseUrl)
                    .build();
        }
    }

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @Override
    public boolean isConfigured() {
        return enabled && !apiKey.isBlank();
    }

    public String getModel() {
        return model;
    }

    public Optional<String> getFallbackModel() {
        return Optional.ofNullable(fallbackModel);
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
                    "AI Provider 'gemini' is enabled but no API key is configured. Please set the GEMINI_API_KEY or AI_API_KEY environment variable."
            );
        }

        String systemPrompt = AiPromptBuilder.buildSystemPrompt();
        String userPrompt = AiPromptBuilder.buildUserPrompt(resumeText, jobDescription, targetRole);

        Map<String, Object> requestPayload = new HashMap<>();
        requestPayload.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemPrompt))
        ));
        requestPayload.put("contents", List.of(
                Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userPrompt))
                )
        ));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.2);
        generationConfig.put("maxOutputTokens", 3500);
        generationConfig.put("responseMimeType", "application/json");
        requestPayload.put("generationConfig", generationConfig);

        String normalizedPrimaryModel = normalizeModelName(this.model);

        try {
            return executeWithRetry(normalizedPrimaryModel, requestPayload, false);
        } catch (TransientFailureException primaryTransientEx) {
            if (isReliableFallbackConfigured(normalizedPrimaryModel)) {
                String normalizedFallbackModel = normalizeModelName(this.fallbackModel);
                log.warn(
                        "Primary Gemini model '{}' failed after {} retries due to transient error (HTTP {} - {}). Attempting explicitly configured fallback model '{}'...",
                        normalizedPrimaryModel,
                        maxRetries,
                        primaryTransientEx.getStatusCode(),
                        primaryTransientEx.getMessage(),
                        normalizedFallbackModel
                );

                try {
                    return executeWithRetry(normalizedFallbackModel, requestPayload, true);
                } catch (TransientFailureException fallbackTransientEx) {
                    log.error(
                            "Fallback Gemini model '{}' also failed after {} retries: HTTP {} - {}",
                            normalizedFallbackModel,
                            maxRetries,
                            fallbackTransientEx.getStatusCode(),
                            fallbackTransientEx.getMessage()
                    );
                    throw new AiServiceException(
                            String.format("AI service unavailable: Primary model '%s' and fallback model '%s' both failed under high load. Please try again later.",
                                    normalizedPrimaryModel, normalizedFallbackModel),
                            fallbackTransientEx
                    );
                }
            }

            // No fallback model configured; surface primary transient failure
            if (primaryTransientEx.getStatusCode() == 503) {
                throw new AiServiceException(
                        String.format("Gemini model '%s' is currently experiencing high demand (HTTP 503). Retries were exhausted. Please wait a moment and try again.", normalizedPrimaryModel),
                        primaryTransientEx
                );
            } else if (primaryTransientEx.getStatusCode() == 429) {
                throw new AiServiceException(
                        String.format("Upstream Gemini rate limit reached for model '%s' (HTTP 429). Retries were exhausted. Please wait a moment and try again.", normalizedPrimaryModel),
                        primaryTransientEx
                );
            } else {
                throw new AiServiceException(
                        String.format("Gemini AI request to model '%s' failed due to transient error: %s", normalizedPrimaryModel, primaryTransientEx.getMessage()),
                        primaryTransientEx
                );
            }
        }
    }

    private AiRawResult executeWithRetry(
            String targetModel,
            Map<String, Object> requestPayload,
            boolean isFallback
    ) throws TransientFailureException {
        String endpointUri = "/models/" + targetModel + ":generateContent";
        int totalAttempts = 1 + maxRetries;

        for (int attempt = 0; attempt < totalAttempts; attempt++) {
            boolean isLastAttempt = (attempt == totalAttempts - 1);

            try {
                log.info(
                        "Dispatching resume improvement request to Gemini model '{}' (attempt {}/{}, fallback={})",
                        targetModel,
                        attempt + 1,
                        totalAttempts,
                        isFallback
                );

                String responseBody = restClient.post()
                        .uri(endpointUri)
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestPayload)
                        .retrieve()
                        .body(String.class);

                if (responseBody == null || responseBody.isBlank()) {
                    throw new AiServiceException("Received empty response body from Gemini AI provider.");
                }

                JsonNode rootNode = objectMapper.readTree(responseBody);
                JsonNode candidatesNode = rootNode.path("candidates");
                if (!candidatesNode.isArray() || candidatesNode.isEmpty()) {
                    String blockReason = rootNode.path("promptFeedback").path("blockReason").asText(null);
                    if (blockReason != null && !blockReason.isBlank()) {
                        throw new AiServiceException("Gemini generation was blocked by safety filters: " + blockReason);
                    }
                    throw new AiServiceException("Malformed AI response: 'candidates' array is missing or empty.");
                }

                JsonNode firstCandidate = candidatesNode.get(0);
                String finishReason = firstCandidate.path("finishReason").asText("");
                if ("SAFETY".equalsIgnoreCase(finishReason)) {
                    throw new AiServiceException("Gemini response was blocked by content safety policies.");
                }

                JsonNode partsNode = firstCandidate.path("content").path("parts");
                if (!partsNode.isArray() || partsNode.isEmpty()) {
                    throw new AiServiceException("Gemini response candidate contains no content parts.");
                }

                String content = partsNode.get(0).path("text").asText(null);
                if (content == null || content.isBlank()) {
                    throw new AiServiceException("Gemini returned empty text content in response candidate.");
                }

                String resolvedModel = rootNode.path("modelVersion").asText(targetModel);
                return new AiRawResult("gemini", resolvedModel, content);

            } catch (ResourceAccessException ex) {
                log.warn(
                        "Gemini model '{}' connection/read timed out on attempt {}/{}",
                        targetModel,
                        attempt + 1,
                        totalAttempts
                );

                if (isLastAttempt) {
                    throw new TransientFailureException("AI service request timed out after retries.", 504, ex);
                }

                long backoffMs = calculateBackoffMillis(attempt, Optional.empty());
                sleepBackoff(backoffMs, targetModel, attempt, totalAttempts);

            } catch (RestClientResponseException ex) {
                int status = ex.getStatusCode().value();

                // 1. Permanent authentication errors: HTTP 401, 403
                if (status == 401 || status == 403) {
                    log.error("Gemini AI provider authentication failed with HTTP status {}", status);
                    throw new AiProviderUnavailableException("AI provider authentication failed. Check server API key configuration.");
                }

                // 2. Transient status codes: 429, 500, 502, 503, 504
                if (isTransientStatus(status)) {
                    String errorDetail = extractErrorDetail(ex.getResponseBodyAsString());
                    String statusMessage = errorDetail != null ? errorDetail : ex.getStatusText();

                    log.warn(
                            "Gemini model '{}' returned transient HTTP status {} on attempt {}/{}: {}",
                            targetModel,
                            status,
                            attempt + 1,
                            totalAttempts,
                            statusMessage
                    );

                    if (isLastAttempt) {
                        throw new TransientFailureException(statusMessage, status, ex);
                    }

                    Optional<Long> retryAfter = extractRetryAfterMillis(ex);
                    long backoffMs = calculateBackoffMillis(attempt, retryAfter);
                    sleepBackoff(backoffMs, targetModel, attempt, totalAttempts);

                } else {
                    // 3. Permanent client errors: HTTP 400, 404, 422, etc. (do NOT retry)
                    String errorDetail = extractErrorDetail(ex.getResponseBodyAsString());
                    String message = "AI provider returned HTTP status " + status + (errorDetail != null ? ": " + errorDetail : "");
                    log.error("Gemini AI provider returned permanent error HTTP status {}: {}", status, errorDetail);
                    throw new AiServiceException(message, ex);
                }

            } catch (AiProviderUnavailableException | AiServiceException ex) {
                // Do not retry application logic or safety block exceptions
                throw ex;
            } catch (Exception ex) {
                log.error("Unexpected error communicating with Gemini AI provider: {}", ex.getMessage());
                throw new AiServiceException("Failed to generate AI recommendations: " + ex.getMessage(), ex);
            }
        }

        throw new TransientFailureException("Exhausted all retry attempts for model " + targetModel, 503, null);
    }

    private boolean isTransientStatus(int statusCode) {
        return statusCode == 429 || statusCode == 500 || statusCode == 502 || statusCode == 503 || statusCode == 504;
    }

    private boolean isReliableFallbackConfigured(String normalizedPrimaryModel) {
        if (fallbackModel == null || fallbackModel.isBlank()) {
            return false;
        }
        String normalizedFallback = normalizeModelName(fallbackModel);
        return !normalizedFallback.equalsIgnoreCase(normalizedPrimaryModel);
    }

    private String normalizeModelName(String rawModel) {
        if (rawModel == null || rawModel.isBlank()) {
            return DEFAULT_MODEL;
        }
        String trimmed = rawModel.trim();
        return trimmed.startsWith("models/") ? trimmed.substring("models/".length()) : trimmed;
    }

    private Optional<Long> extractRetryAfterMillis(RestClientResponseException ex) {
        HttpHeaders headers = ex.getResponseHeaders();
        if (headers == null) {
            return Optional.empty();
        }

        String retryAfterHeader = headers.getFirst(HttpHeaders.RETRY_AFTER);
        if (retryAfterHeader == null || retryAfterHeader.isBlank()) {
            return Optional.empty();
        }

        String trimmed = retryAfterHeader.trim();

        // 1. Try parsing decimal or integer seconds (e.g. "5" or "12")
        try {
            double seconds = Double.parseDouble(trimmed);
            if (seconds >= 0) {
                long millis = (long) (seconds * 1000L);
                return Optional.of(Math.min(millis, MAX_ALLOWED_RETRY_AFTER_MS));
            }
        } catch (NumberFormatException ignored) {
        }

        // 2. Try parsing RFC 1123 HTTP-date
        try {
            ZonedDateTime date = ZonedDateTime.parse(trimmed, DateTimeFormatter.RFC_1123_DATE_TIME);
            long millis = Duration.between(Instant.now(), date.toInstant()).toMillis();
            if (millis > 0) {
                return Optional.of(Math.min(millis, MAX_ALLOWED_RETRY_AFTER_MS));
            }
        } catch (DateTimeParseException ignored) {
        }

        return Optional.empty();
    }

    long calculateBackoffMillis(int retryAttempt, Optional<Long> retryAfterMillis) {
        // Exponential backoff: initialBackoffMs * 2^retryAttempt
        long exponential = initialBackoffMs * (1L << Math.min(retryAttempt, 10));
        long cappedExponential = Math.min(exponential, maxBackoffMs);

        // Jitter: between 50% and 100% of cappedExponential
        long jittered;
        if (cappedExponential <= 1) {
            jittered = cappedExponential;
        } else {
            long minBound = cappedExponential / 2;
            jittered = minBound + ThreadLocalRandom.current().nextLong(cappedExponential - minBound + 1);
        }

        // Respect Retry-After header if provided
        if (retryAfterMillis.isPresent()) {
            long retryAfter = retryAfterMillis.get();
            return Math.max(jittered, retryAfter);
        }

        return jittered;
    }

    private void sleepBackoff(long backoffMs, String modelName, int attempt, int totalAttempts) {
        log.info(
                "Backing off for {} ms before retry {}/{} for Gemini model '{}'",
                backoffMs,
                attempt + 2,
                totalAttempts,
                modelName
        );
        try {
            sleeper.sleep(backoffMs);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new AiServiceException("Request retry backoff was interrupted", ie);
        }
    }

    private String extractErrorDetail(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String message = root.path("error").path("message").asText(null);
            return (message != null && !message.isBlank()) ? message : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private static class TransientFailureException extends Exception {
        private final int statusCode;

        TransientFailureException(String message, int statusCode, Throwable cause) {
            super(message, cause);
            this.statusCode = statusCode;
        }

        public int getStatusCode() {
            return statusCode;
        }
    }
}
