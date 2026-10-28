package com.careerpilot.service.ai;

import com.careerpilot.exception.AiProviderUnavailableException;
import com.careerpilot.exception.AiServiceException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiAiProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private List<Long> recordedSleeps;
    private GeminiAiProvider.BackoffSleeper testSleeper;

    private static final String VALID_GEMINI_RESPONSE = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      {
                        "text": "{\\"improvedSummary\\":{\\"original\\":\\"Java dev\\",\\"suggested\\":\\"Senior Java Engineer\\",\\"rationale\\":\\"Targeted\\"}}"
                      }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP"
                }
              ],
              "modelVersion": "gemini-2.5-flash"
            }
            """;

    private static final String VALID_FALLBACK_RESPONSE = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      {
                        "text": "{\\"improvedSummary\\":{\\"original\\":\\"Java dev\\",\\"suggested\\":\\"Senior Java Engineer\\",\\"rationale\\":\\"Fallback generated\\"}}"
                      }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP"
                }
              ],
              "modelVersion": "gemini-2.0-flash"
            }
            """;

    @BeforeEach
    void setUp() {
        restClientBuilder = RestClient.builder().baseUrl(GeminiAiProvider.DEFAULT_BASE_URL);
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        recordedSleeps = new ArrayList<>();
        testSleeper = recordedSleeps::add;
    }

    private GeminiAiProvider createProvider(int maxRetries, String model, String fallbackModel) {
        return new GeminiAiProvider(
                true,
                "AIzaSySecretKey",
                model,
                fallbackModel,
                GeminiAiProvider.DEFAULT_BASE_URL,
                restClientBuilder.build(),
                objectMapper,
                maxRetries,
                10L,
                100L,
                testSleeper
        );
    }

    @Test
    @DisplayName("isConfigured returns false when enabled is false")
    void isConfigured_Disabled_ReturnsFalse() {
        GeminiAiProvider provider = new GeminiAiProvider(
                false, "AIzaSyTestKey", "gemini-2.5-flash", null, GeminiAiProvider.DEFAULT_BASE_URL,
                restClientBuilder.build(), objectMapper, 2, 10L, 50L, testSleeper
        );

        assertThat(provider.isConfigured()).isFalse();
        assertThat(provider.getProviderName()).isEqualTo("gemini");
    }

    @Test
    @DisplayName("isConfigured returns false when API key is blank")
    void isConfigured_BlankKey_ReturnsFalse() {
        GeminiAiProvider provider = new GeminiAiProvider(
                true, "   ", "gemini-2.5-flash", null, GeminiAiProvider.DEFAULT_BASE_URL,
                restClientBuilder.build(), objectMapper, 2, 10L, 50L, testSleeper
        );

        assertThat(provider.isConfigured()).isFalse();
    }

    @Test
    @DisplayName("isConfigured returns true when enabled and API key is present")
    void isConfigured_EnabledWithKey_ReturnsTrue() {
        GeminiAiProvider provider = createProvider(2, "gemini-2.5-flash", null);

        assertThat(provider.isConfigured()).isTrue();
        assertThat(provider.getProviderName()).isEqualTo("gemini");
        assertThat(provider.getModel()).isEqualTo("gemini-2.5-flash");
    }

    @Test
    @DisplayName("generateImprovement throws 503 AiProviderUnavailableException when disabled")
    void generateImprovement_Disabled_ThrowsException() {
        GeminiAiProvider provider = new GeminiAiProvider(
                false, "AIzaSyKey", "gemini-2.5-flash", null, GeminiAiProvider.DEFAULT_BASE_URL,
                restClientBuilder.build(), objectMapper, 2, 10L, 50L, testSleeper
        );

        assertThatThrownBy(() -> provider.generateImprovement("resume text", "job description", "Backend Engineer"))
                .isInstanceOf(AiProviderUnavailableException.class)
                .hasMessageContaining("AI Resume Improvement service is currently disabled");
    }

    @Test
    @DisplayName("generateImprovement throws 503 AiProviderUnavailableException when API key is blank")
    void generateImprovement_BlankKey_ThrowsException() {
        GeminiAiProvider provider = new GeminiAiProvider(
                true, "", "gemini-2.5-flash", null, GeminiAiProvider.DEFAULT_BASE_URL,
                restClientBuilder.build(), objectMapper, 2, 10L, 50L, testSleeper
        );

        assertThatThrownBy(() -> provider.generateImprovement("resume text", "job description", "Backend Engineer"))
                .isInstanceOf(AiProviderUnavailableException.class)
                .hasMessageContaining("no API key is configured");
    }

    @Test
    @DisplayName("generateImprovement sends x-goog-api-key header and parses valid candidate response")
    void generateImprovement_Success_ReturnsRawResult() {
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "AIzaSySecretKey"))
                .andExpect(header("Content-Type", MediaType.APPLICATION_JSON_VALUE))
                .andRespond(withSuccess(VALID_GEMINI_RESPONSE, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = createProvider(2, "gemini-2.5-flash", null);

        AiRawResult result = provider.generateImprovement("Candidate Resume", "Target Job Description", "Staff Engineer");

        mockServer.verify();
        assertThat(result).isNotNull();
        assertThat(result.provider()).isEqualTo("gemini");
        assertThat(result.model()).isEqualTo("gemini-2.5-flash");
        assertThat(result.content()).contains("Senior Java Engineer");
        assertThat(recordedSleeps).isEmpty();
    }

    @Test
    @DisplayName("generateImprovement retries on transient HTTP 503 high demand and succeeds on subsequent attempt")
    void generateImprovement_Transient503HighDemand_RetriesAndSucceeds() {
        String highDemandResponse = """
                {
                  "error": {
                    "code": 503,
                    "message": "This model is currently experiencing high demand. Please try again later.",
                    "status": "UNAVAILABLE"
                  }
                }
                """;

        // 1st request fails with 503 High Demand
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(highDemandResponse));

        // 2nd request (retry) succeeds with 200 OK
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(VALID_GEMINI_RESPONSE, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = createProvider(3, "gemini-2.5-flash", null);

        AiRawResult result = provider.generateImprovement("Resume", "Job", "Dev");

        mockServer.verify();
        assertThat(result).isNotNull();
        assertThat(result.content()).contains("Senior Java Engineer");
        assertThat(recordedSleeps).hasSize(1);
        assertThat(recordedSleeps.get(0)).isPositive();
    }

    @Test
    @DisplayName("generateImprovement retries on transient HTTP 429 rate limit and succeeds on subsequent attempt")
    void generateImprovement_Transient429_RetriesAndSucceeds() {
        // 1st request fails with 429
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":429,\"message\":\"Resource has been exhausted (e.g. check quota).\"}}"));

        // 2nd request succeeds
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withSuccess(VALID_GEMINI_RESPONSE, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = createProvider(2, "gemini-2.5-flash", null);

        AiRawResult result = provider.generateImprovement("Resume", "Job", "Dev");

        mockServer.verify();
        assertThat(result).isNotNull();
        assertThat(recordedSleeps).hasSize(1);
    }

    @Test
    @DisplayName("generateImprovement respects Retry-After header during backoff")
    void generateImprovement_RespectsRetryAfterHeader() {
        // 1st request sends Retry-After: 3 seconds
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .header(HttpHeaders.RETRY_AFTER, "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":503,\"message\":\"Overloaded\"}}"));

        // 2nd request succeeds
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withSuccess(VALID_GEMINI_RESPONSE, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = createProvider(2, "gemini-2.5-flash", null);

        AiRawResult result = provider.generateImprovement("Resume", "Job", "Dev");

        mockServer.verify();
        assertThat(result).isNotNull();
        assertThat(recordedSleeps).hasSize(1);
        // Retry-After of 3s must enforce at least 3000ms delay
        assertThat(recordedSleeps.get(0)).isGreaterThanOrEqualTo(3000L);
    }

    @Test
    @DisplayName("generateImprovement retries on connection timeout and succeeds")
    void generateImprovement_Timeout_RetriesAndSucceeds() {
        // 1st attempt throws SocketTimeoutException
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        // 2nd attempt succeeds
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withSuccess(VALID_GEMINI_RESPONSE, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = createProvider(2, "gemini-2.5-flash", null);

        AiRawResult result = provider.generateImprovement("Resume", "Job", "Dev");

        mockServer.verify();
        assertThat(result).isNotNull();
        assertThat(recordedSleeps).hasSize(1);
    }

    @Test
    @DisplayName("generateImprovement throws AiServiceException when all 503 retries are exhausted")
    void generateImprovement_RetriesExhausted503_ThrowsAiServiceException() {
        int maxRetries = 2; // total 3 attempts
        mockServer.expect(ExpectedCount.times(3), requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":503,\"message\":\"This model is currently experiencing high demand.\"}}"));

        GeminiAiProvider provider = createProvider(maxRetries, "gemini-2.5-flash", null);

        assertThatThrownBy(() -> provider.generateImprovement("Resume", "Job", "Dev"))
                .isInstanceOf(AiServiceException.class)
                .hasMessageContaining("high demand (HTTP 503)")
                .hasMessageContaining("Retries were exhausted");

        mockServer.verify();
        assertThat(recordedSleeps).hasSize(2);
    }

    @Test
    @DisplayName("generateImprovement switches to explicitly configured fallback model when primary model exhausts retries")
    void generateImprovement_FallbackModel_SucceedsWithFallback() {
        int maxRetries = 1; // 2 attempts per model

        // Primary model 'gemini-2.5-flash' fails 2 times with 503
        mockServer.expect(ExpectedCount.times(2), requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":503,\"message\":\"High demand\"}}"));

        // Fallback model 'gemini-2.0-flash' succeeds
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"))
                .andRespond(withSuccess(VALID_FALLBACK_RESPONSE, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = createProvider(maxRetries, "gemini-2.5-flash", "gemini-2.0-flash");

        AiRawResult result = provider.generateImprovement("Resume", "Job", "Dev");

        mockServer.verify();
        assertThat(result).isNotNull();
        assertThat(result.provider()).isEqualTo("gemini");
        assertThat(result.model()).isEqualTo("gemini-2.0-flash");
        assertThat(result.content()).contains("Fallback generated");
    }

    @Test
    @DisplayName("generateImprovement throws AiServiceException when both primary and fallback models fail")
    void generateImprovement_PrimaryAndFallbackFail_ThrowsAiServiceException() {
        int maxRetries = 1; // 2 attempts per model

        // Primary model fails twice
        mockServer.expect(ExpectedCount.times(2), requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":503,\"message\":\"Primary down\"}}"));

        // Fallback model fails twice
        mockServer.expect(ExpectedCount.times(2), requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":503,\"message\":\"Fallback also down\"}}"));

        GeminiAiProvider provider = createProvider(maxRetries, "gemini-2.5-flash", "gemini-2.0-flash");

        assertThatThrownBy(() -> provider.generateImprovement("Resume", "Job", "Dev"))
                .isInstanceOf(AiServiceException.class)
                .hasMessageContaining("Primary model 'gemini-2.5-flash' and fallback model 'gemini-2.0-flash' both failed");

        mockServer.verify();
    }

    @Test
    @DisplayName("generateImprovement does NOT retry or invoke fallback on HTTP 401 permanent auth failure")
    void generateImprovement_AuthFailed_FailsImmediatelyWithoutRetry() {
        mockServer.expect(ExpectedCount.once(), requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("{\"error\":{\"message\":\"API key not valid\"}}"));

        GeminiAiProvider provider = createProvider(3, "gemini-2.5-flash", "gemini-2.0-flash");

        assertThatThrownBy(() -> provider.generateImprovement("Resume", "Job", "Dev"))
                .isInstanceOf(AiProviderUnavailableException.class)
                .hasMessageContaining("AI provider authentication failed");

        mockServer.verify();
        assertThat(recordedSleeps).isEmpty();
    }

    @Test
    @DisplayName("generateImprovement does NOT retry permanent HTTP 400 invalid argument error")
    void generateImprovement_BadRequest400_FailsImmediatelyWithoutRetry() {
        mockServer.expect(ExpectedCount.once(), requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":{\"message\":\"Invalid JSON request payload\"}}"));

        GeminiAiProvider provider = createProvider(3, "gemini-2.5-flash", "gemini-2.0-flash");

        assertThatThrownBy(() -> provider.generateImprovement("Resume", "Job", "Dev"))
                .isInstanceOf(AiServiceException.class)
                .hasMessageContaining("HTTP status 400");

        mockServer.verify();
        assertThat(recordedSleeps).isEmpty();
    }

    @Test
    @DisplayName("generateImprovement does NOT retry when safety filter blocks generation")
    void generateImprovement_SafetyBlocked_FailsImmediatelyWithoutRetry() {
        String blockedResponse = """
                {
                  "candidates": [],
                  "promptFeedback": {
                    "blockReason": "SAFETY"
                  }
                }
                """;

        mockServer.expect(ExpectedCount.once(), requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withSuccess(blockedResponse, MediaType.APPLICATION_JSON));

        GeminiAiProvider provider = createProvider(3, "gemini-2.5-flash", "gemini-2.0-flash");

        assertThatThrownBy(() -> provider.generateImprovement("Resume", "Job", "Dev"))
                .isInstanceOf(AiServiceException.class)
                .hasMessageContaining("blocked by safety filters");

        mockServer.verify();
        assertThat(recordedSleeps).isEmpty();
    }

    @Test
    @DisplayName("calculateBackoffMillis produces bounded exponential backoff within configured bounds")
    void calculateBackoffMillis_ProducesBoundedExponentialBackoff() {
        GeminiAiProvider provider = createProvider(3, "gemini-2.5-flash", null);

        // Check attempt 0: initial is 10ms, capped at 100ms. Jitter is between 5ms and 10ms.
        long delay0 = provider.calculateBackoffMillis(0, Optional.empty());
        assertThat(delay0).isBetween(5L, 10L);

        // Check attempt 1: 10 * 2^1 = 20ms. Jitter between 10ms and 20ms.
        long delay1 = provider.calculateBackoffMillis(1, Optional.empty());
        assertThat(delay1).isBetween(10L, 20L);

        // Check high attempt: capped at maxBackoffMs (100ms). Jitter between 50ms and 100ms.
        long delayLarge = provider.calculateBackoffMillis(10, Optional.empty());
        assertThat(delayLarge).isBetween(50L, 100L);
    }
}
