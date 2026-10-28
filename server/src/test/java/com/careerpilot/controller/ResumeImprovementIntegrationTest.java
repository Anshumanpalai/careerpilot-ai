package com.careerpilot.controller;

import com.careerpilot.dto.ResumeImprovementRequest;
import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import com.careerpilot.exception.AiProviderUnavailableException;
import com.careerpilot.repository.ResumeImprovementRepository;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.repository.UserRepository;
import com.careerpilot.security.JwtTokenProvider;
import com.careerpilot.service.ai.AiProvider;
import com.careerpilot.service.ai.AiRateLimiter;
import com.careerpilot.service.ai.AiRawResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ResumeImprovementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private ResumeImprovementRepository improvementRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AiRateLimiter aiRateLimiter;

    @MockBean
    private AiProvider aiProvider;

    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;
    private Resume parsedResumeA;
    private Resume unparsedResumeA;

    private static final String SAMPLE_JD =
            "We are seeking an experienced Senior Backend Software Engineer with 5+ years of experience in Java, Spring Boot, and PostgreSQL. Experience with Docker and Kubernetes is required. AWS deployment experience is preferred.";

    private static final String VALID_AI_RESPONSE_JSON = """
            {
              "improvedSummary": {
                "original": "Backend engineer with 4 years developing web systems.",
                "suggested": "Performance-driven Senior Backend Engineer with proven expertise building scalable Spring Boot microservices, high-throughput PostgreSQL databases, and resilient Dockerized architectures.",
                "rationale": "Directly highlights core requirements (Java, Spring Boot, PostgreSQL) while maintaining factual truth."
              },
              "bulletPointSuggestions": [
                {
                  "original": "Worked on backend APIs using Spring Boot and handled database queries.",
                  "suggested": "Architected modular REST APIs utilizing Spring Boot and optimized complex PostgreSQL queries.",
                  "rationale": "Replaced weak passive verb 'worked on' with active leadership verbs while keeping factual responsibilities unchanged.",
                  "requiresUserEvidence": true,
                  "evidencePrompt": "Please verify if query latency or throughput improved and provide genuine metrics if known."
                }
              ],
              "evidencedSkills": [
                {
                  "skill": "Java",
                  "category": "Programming Languages",
                  "evidenceSnippet": "4 years developing Java enterprise services"
                },
                {
                  "skill": "Spring Boot",
                  "category": "Frameworks",
                  "evidenceSnippet": "Built REST endpoints with Spring Boot"
                },
                {
                  "skill": "PostgreSQL",
                  "category": "Databases",
                  "evidenceSnippet": "Designed schemas in PostgreSQL"
                }
              ],
              "learningGaps": [
                {
                  "missingRequirement": "Kubernetes",
                  "importance": "REQUIRED",
                  "reason": "Container orchestration via Kubernetes is explicitly required in job description but not evidenced in resume text."
                },
                {
                  "missingRequirement": "AWS",
                  "importance": "PREFERRED",
                  "reason": "Cloud deployment experience on AWS is preferred but absent from verified background."
                }
              ],
              "prioritizedRecommendations": [
                {
                  "priority": "HIGH",
                  "title": "Address Kubernetes Orchestration Gap",
                  "actionableAdvice": "Build a hands-on project deploying Spring microservices to a local Minikube cluster and document manifests."
                },
                {
                  "priority": "MEDIUM",
                  "title": "Quantify Database Optimization Accomplishments",
                  "actionableAdvice": "Provide verified numbers for query latency improvements achieved in PostgreSQL projects."
                }
              ],
              "learningRoadmap": [
                {
                  "skill": "Kubernetes",
                  "actionSteps": [
                    "Study Pod, Deployment, and Service architecture",
                    "Deploy Spring Boot application with Helm to Minikube",
                    "Configure ConfigMaps and Secrets"
                  ],
                  "estimatedTimeToAcquire": "2-3 weeks",
                  "recommendedTopics": ["Kubernetes Fundamentals", "CKAD Curriculum", "Container Orchestration"]
                }
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        improvementRepository.deleteAll();
        resumeRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new User(
                "candidate.alpha@example.com",
                passwordEncoder.encode("Password123!"),
                "Candidate Alpha",
                UserRole.JOB_SEEKER,
                "Backend Engineer"
        ));

        userB = userRepository.save(new User(
                "candidate.beta@example.com",
                passwordEncoder.encode("Password123!"),
                "Candidate Beta",
                UserRole.JOB_SEEKER,
                "Frontend Engineer"
        ));

        tokenA = jwtTokenProvider.generateToken(userA);
        tokenB = jwtTokenProvider.generateToken(userB);

        parsedResumeA = new Resume(
                userA,
                "alpha_resume.pdf",
                "storage/alpha_resume.pdf",
                "application/pdf",
                1024L * 50,
                ResumeStatus.PARSED
        );
        parsedResumeA.setRawText("""
                Candidate Alpha
                Email: candidate.alpha@example.com
                
                Professional Experience:
                Software Engineer at TechCorp (2020 - Present)
                - Worked on backend APIs using Spring Boot and handled database queries.
                - Designed schemas in PostgreSQL and implemented integration tests with JUnit.
                - 4 years developing Java enterprise services and Docker containers.
                
                Skills:
                Java, Spring Boot, PostgreSQL, Docker, Git, JUnit
                """);
        parsedResumeA.setSkillsSummary("Java, Spring Boot, PostgreSQL, Docker, Git, JUnit");
        parsedResumeA.setExperienceSummary("Software Engineer at TechCorp (2020 - Present)");
        parsedResumeA = resumeRepository.save(parsedResumeA);

        unparsedResumeA = new Resume(
                userA,
                "unparsed_resume.docx",
                "storage/unparsed_resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                1024L * 25,
                ResumeStatus.UPLOADED
        );
        unparsedResumeA = resumeRepository.save(unparsedResumeA);

        aiRateLimiter.resetForUser(userA.getId());
        aiRateLimiter.resetForUser(userB.getId());
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Rejects unauthenticated request with 401")
    void improveResume_Unauthenticated_Returns401() throws Exception {
        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Rejects request when consent is null or false with 400")
    void improveResume_MissingConsent_Returns400() throws Exception {
        ResumeImprovementRequest requestNoConsent = new ResumeImprovementRequest(SAMPLE_JD, false, "Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestNoConsent)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.userConsent", containsString("consent")));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Rejects blank or short job description with 400")
    void improveResume_ShortJobDescription_Returns400() throws Exception {
        ResumeImprovementRequest requestShortJd = new ResumeImprovementRequest("Too short", true, "Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestShortJd)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Validation failed")));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Rejects unparsed resume with 400")
    void improveResume_UnparsedResume_Returns400() throws Exception {
        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", unparsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Resume must be parsed before generating AI improvements")));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Rejects cross-user access with 403")
    void improveResume_CrossUserAccess_Returns403() throws Exception {
        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        // User B tries to improve User A's resume
        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Returns 503 when AI provider is disabled or unconfigured")
    void improveResume_ProviderUnavailable_Returns503() throws Exception {
        when(aiProvider.generateImprovement(any(), any(), any()))
                .thenThrow(new AiProviderUnavailableException("AI Resume Improvement service is currently disabled."));

        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message", containsString("AI Resume Improvement service is currently disabled")));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Rate limiting returns 429 when quota exceeded")
    void improveResume_RateLimitExceeded_Returns429() throws Exception {
        when(aiProvider.generateImprovement(any(), any(), any()))
                .thenReturn(new AiRawResult("openai", "gpt-4o-mini", VALID_AI_RESPONSE_JSON));

        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        // Exhaust user A's limit (5 per minute)
        for (int i = 0; i < aiRateLimiter.getMaxRequestsPerMinute(); i++) {
            mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());
        }

        // 6th request must be rejected with 429
        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message", containsString("Rate limit reached")));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Successfully persists and returns validated structured recommendations")
    void improveResume_Success_SavesAndReturnsStructuredRecommendations() throws Exception {
        when(aiProvider.generateImprovement(any(), any(), any()))
                .thenReturn(new AiRawResult("openai", "gpt-4o-mini", VALID_AI_RESPONSE_JSON));

        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Senior Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeId", is(parsedResumeA.getId().toString())))
                .andExpect(jsonPath("$.providerName", is("openai")))
                .andExpect(jsonPath("$.modelName", is("gpt-4o-mini")))
                .andExpect(jsonPath("$.targetRole", is("Senior Backend Engineer")))
                .andExpect(jsonPath("$.improvedSummary.suggested", containsString("Senior Backend Engineer")))
                .andExpect(jsonPath("$.bulletPointSuggestions", hasSize(1)))
                .andExpect(jsonPath("$.bulletPointSuggestions[0].requiresUserEvidence", is(true)))
                .andExpect(jsonPath("$.bulletPointSuggestions[0].evidencePrompt", containsString("Please verify")))
                .andExpect(jsonPath("$.evidencedSkills", hasSize(3)))
                .andExpect(jsonPath("$.evidencedSkills[0].skill", is("Java")))
                .andExpect(jsonPath("$.learningGaps", hasSize(2)))
                .andExpect(jsonPath("$.learningGaps[0].missingRequirement", is("Kubernetes")))
                .andExpect(jsonPath("$.prioritizedRecommendations", hasSize(2)))
                .andExpect(jsonPath("$.learningRoadmap", hasSize(1)))
                .andExpect(jsonPath("$.complianceNotice", containsString("Disclaimer: All AI suggestions preserve the candidate's verified background")));

        // Verify database persistence
        var savedImprovements = improvementRepository.findByResumeIdAndUserIdOrderByCreatedAtDesc(parsedResumeA.getId(), userA.getId());
        assertThat(savedImprovements).hasSize(1);
        assertThat(savedImprovements.get(0).getProviderName()).isEqualTo("openai");
        assertThat(savedImprovements.get(0).getModelName()).isEqualTo("gpt-4o-mini");
    }

    @Test
    @DisplayName("GET /api/v1/resumes/{id}/improvements/latest - Retrieves most recent improvement")
    void getLatestImprovement_Success_ReturnsLatest() throws Exception {
        when(aiProvider.generateImprovement(any(), any(), any()))
                .thenReturn(new AiRawResult("openai", "gpt-4o-mini", VALID_AI_RESPONSE_JSON));

        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        // First generate an improvement
        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Now retrieve latest
        mockMvc.perform(get("/api/v1/resumes/{id}/improvements/latest", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeId", is(parsedResumeA.getId().toString())))
                .andExpect(jsonPath("$.bulletPointSuggestions", hasSize(1)))
                .andExpect(jsonPath("$.learningGaps[0].missingRequirement", is("Kubernetes")));
    }

    @Test
    @DisplayName("GET /api/v1/resumes/{id}/improvements/latest - Returns 404 when no improvements exist")
    void getLatestImprovement_NotFound_Returns404() throws Exception {
        mockMvc.perform(get("/api/v1/resumes/{id}/improvements/latest", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("No AI improvement recommendations found")));
    }

    @Test
    @DisplayName("GET /api/v1/resumes/{id}/improvements/latest - Rejects cross-user retrieval with 403")
    void getLatestImprovement_CrossUser_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/resumes/{id}/improvements/latest", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Handles markdown-wrapped JSON cleanly without errors")
    void improveResume_MarkdownWrappedJson_ParsesCleanly() throws Exception {
        String markdownWrapped = "```json\n" + VALID_AI_RESPONSE_JSON + "\n```";
        when(aiProvider.generateImprovement(any(), any(), any()))
                .thenReturn(new AiRawResult("openai", "gpt-4o-mini", markdownWrapped));

        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.improvedSummary.suggested", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/improve - Malformed JSON from provider returns 502 Bad Gateway")
    void improveResume_MalformedJson_Returns502() throws Exception {
        when(aiProvider.generateImprovement(any(), any(), any()))
                .thenReturn(new AiRawResult("openai", "gpt-4o-mini", "THIS IS NOT VALID JSON AT ALL {[["));

        ResumeImprovementRequest request = new ResumeImprovementRequest(SAMPLE_JD, true, "Backend Engineer");

        mockMvc.perform(post("/api/v1/resumes/{id}/improve", parsedResumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message", containsString("Failed to parse structured recommendations")));
    }
}
