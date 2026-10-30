package com.careerpilot.controller;

import com.careerpilot.dto.*;
import com.careerpilot.entity.*;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.repository.ResumeVersionRepository;
import com.careerpilot.repository.UserRepository;
import com.careerpilot.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ResumeVersionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private ResumeVersionRepository resumeVersionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;
    private Resume resumeA;

    @BeforeEach
    void setUp() {
        resumeVersionRepository.deleteAll();
        resumeRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new User(
                "user_a_version@careerpilot.com",
                passwordEncoder.encode("Password123!"),
                "Alex Rivera",
                UserRole.JOB_SEEKER,
                "Software Engineer"
        ));
        tokenA = jwtTokenProvider.generateToken(userA);

        userB = userRepository.save(new User(
                "user_b_version@careerpilot.com",
                passwordEncoder.encode("Password123!"),
                "Jordan Lee",
                UserRole.JOB_SEEKER,
                "Product Manager"
        ));
        tokenB = jwtTokenProvider.generateToken(userB);

        resumeA = new Resume(
                userA,
                "Alex_Rivera_Resume.pdf",
                "storage-key-res-a-" + UUID.randomUUID(),
                "application/pdf",
                102400L,
                ResumeStatus.PARSED
        );
        resumeA.setRawText("Alex Rivera\nSenior Software Engineer\nSummary: Passionate about high-throughput distributed systems.\nSkills: Java, Spring Boot, PostgreSQL, Docker\nExperience: Tech Lead at Acme Corp.");
        resumeA.setSkillsSummary("Java, Spring Boot, PostgreSQL, Docker");
        resumeA.setExperienceSummary("• Led microservices architecture reaching 50k RPS\n• Reduced latency by 40%");
        resumeA.setEducationSummary("B.S. in Computer Science, University of Technology");
        resumeA.setProjectsSummary("• CareerPilot AI: Career copilot backend with Spring Boot");
        resumeA = resumeRepository.save(resumeA);
    }

    @Test
    @DisplayName("Auto-seeds baseline v1 version if no versions exist yet")
    void testAutoSeedBaseVersion() throws Exception {
        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/versions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].versionNumber").value(1))
                .andExpect(jsonPath("$[0].versionName").value("v1 - Baseline (Uploaded)"))
                .andExpect(jsonPath("$[0].isBaseVersion").value(true))
                .andExpect(jsonPath("$[0].skills").value(containsString("Java, Spring Boot")));
    }

    @Test
    @DisplayName("Create a new independent resume version")
    void testCreateResumeVersion() throws Exception {
        CreateResumeVersionRequest request = new CreateResumeVersionRequest(
                "v2 - Frontend Specialization",
                "Lead Frontend Engineer",
                "Google",
                "High-impact frontend architect specializing in React 19.",
                "React 19, TypeScript, Tailwind CSS, Next.js",
                "• Architected enterprise web app with 99.9% uptime",
                "B.S. Computer Science",
                "• Open-source UI component library",
                "Certifications: AWS Certified Solutions Architect",
                false
        );

        mockMvc.perform(post("/api/v1/resumes/" + resumeA.getId() + "/versions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionName").value("v2 - Frontend Specialization"))
                .andExpect(jsonPath("$.targetRole").value("Lead Frontend Engineer"))
                .andExpect(jsonPath("$.targetCompany").value("Google"))
                .andExpect(jsonPath("$.versionNumber").value(1))
                .andExpect(jsonPath("$.isBaseVersion").value(false));
    }

    @Test
    @DisplayName("Update existing resume version independently")
    void testUpdateResumeVersion() throws Exception {
        // Create initial version
        ResumeVersion version = new ResumeVersion(
                resumeA, userA, 1, "Initial Draft", "Backend Eng", "Stripe",
                "Original summary", "Java, SQL", "Original experience", "BS CS", "Original project", null, false, null
        );
        version = resumeVersionRepository.save(version);

        UpdateResumeVersionRequest updateReq = new UpdateResumeVersionRequest(
                "Updated v1 Draft",
                "Staff Backend Engineer",
                "Stripe Inc",
                "Refined executive summary with metrics.",
                "Java 21, Spring Boot 3.4, PostgreSQL, Kubernetes",
                "• Scaled database read replicas across 3 availability zones",
                "BS Computer Science",
                "• Real-time payment processor service",
                "AWS Certified Professional"
        );

        mockMvc.perform(put("/api/v1/resumes/" + resumeA.getId() + "/versions/" + version.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionName").value("Updated v1 Draft"))
                .andExpect(jsonPath("$.targetRole").value("Staff Backend Engineer"))
                .andExpect(jsonPath("$.summary").value("Refined executive summary with metrics."));

        // Confirm original resume entity was untouched!
        Resume preserved = resumeRepository.findById(resumeA.getId()).orElseThrow();
        assertThat(preserved.getSkillsSummary()).isEqualTo("Java, Spring Boot, PostgreSQL, Docker");
    }

    @Test
    @DisplayName("Duplicate version creates independent clone with parent version reference")
    void testDuplicateResumeVersion() throws Exception {
        ResumeVersion v1 = new ResumeVersion(
                resumeA, userA, 1, "v1 - Base", "Backend Dev", null,
                "Summary 1", "Java, Go", "Exp 1", "Edu 1", "Proj 1", null, true, null
        );
        v1 = resumeVersionRepository.save(v1);

        DuplicateResumeVersionRequest dupReq = new DuplicateResumeVersionRequest(
                "v2 - Tailored for Netflix",
                "Senior Distributed Systems Engineer",
                "Netflix"
        );

        mockMvc.perform(post("/api/v1/resumes/" + resumeA.getId() + "/versions/" + v1.getId() + "/duplicate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber").value(2))
                .andExpect(jsonPath("$.versionName").value("v2 - Tailored for Netflix"))
                .andExpect(jsonPath("$.targetRole").value("Senior Distributed Systems Engineer"))
                .andExpect(jsonPath("$.targetCompany").value("Netflix"))
                .andExpect(jsonPath("$.parentVersionId").value(v1.getId().toString()))
                .andExpect(jsonPath("$.parentVersionNumber").value(1));
    }

    @Test
    @DisplayName("Restore version creates a NEW version rather than overwriting historical version")
    void testRestoreCreatesNewVersion() throws Exception {
        ResumeVersion v1 = resumeVersionRepository.save(new ResumeVersion(
                resumeA, userA, 1, "v1 - Initial", "SWE", null,
                "Initial Summary", "Java", "Exp", "Edu", "Proj", null, true, null
        ));
        ResumeVersion v2 = resumeVersionRepository.save(new ResumeVersion(
                resumeA, userA, 2, "v2 - Heavy Edits", "Lead SWE", null,
                "Edited Summary", "Java, Python", "Exp 2", "Edu", "Proj", null, false, v1
        ));

        // Restore from v1
        RestoreResumeVersionRequest restoreReq = new RestoreResumeVersionRequest("v3 - Restored Baseline");

        mockMvc.perform(post("/api/v1/resumes/" + resumeA.getId() + "/versions/" + v1.getId() + "/restore")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(restoreReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber").value(3))
                .andExpect(jsonPath("$.versionName").value("v3 - Restored Baseline"))
                .andExpect(jsonPath("$.summary").value("Initial Summary"))
                .andExpect(jsonPath("$.parentVersionId").value(v1.getId().toString()));

        // Verify v1 and v2 still exist completely unchanged!
        assertThat(resumeVersionRepository.findById(v1.getId()).orElseThrow().getSummary()).isEqualTo("Initial Summary");
        assertThat(resumeVersionRepository.findById(v2.getId()).orElseThrow().getSummary()).isEqualTo("Edited Summary");
        assertThat(resumeVersionRepository.countByResumeIdAndUserId(resumeA.getId(), userA.getId())).isEqualTo(3);
    }

    @Test
    @DisplayName("Compare two versions computes section diffs, word deltas, and skill changes")
    void testCompareVersions() throws Exception {
        ResumeVersion v1 = resumeVersionRepository.save(new ResumeVersion(
                resumeA, userA, 1, "v1", "Dev", null,
                "Brief summary.", "Java, Spring", "Old experience", "BS CS", "Proj 1", null, true, null
        ));
        ResumeVersion v2 = resumeVersionRepository.save(new ResumeVersion(
                resumeA, userA, 2, "v2", "Senior Dev", null,
                "Comprehensive high impact professional summary with rich details.", "Java, Spring, Kubernetes, Docker",
                "New experience with enhanced metrics", "BS CS", "Proj 1", null, false, v1
        ));

        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/versions/compare")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .param("source", v1.getId().toString())
                        .param("target", v2.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summaryDiff.modified").value(true))
                .andExpect(jsonPath("$.skillsDiff.modified").value(true))
                .andExpect(jsonPath("$.educationDiff.modified").value(false))
                .andExpect(jsonPath("$.addedSkills", hasItems("docker", "kubernetes")))
                .andExpect(jsonPath("$.wordCountDelta").value(greaterThan(0)));
    }

    @Test
    @DisplayName("Apply AI suggestion to resume draft")
    void testApplyAiSuggestion() throws Exception {
        ResumeVersion version = resumeVersionRepository.save(new ResumeVersion(
                resumeA, userA, 1, "v1", "Dev", null,
                "Old summary.", "Java", "• Led feature development.", "BS CS", "Proj", null, true, null
        ));

        // 1. Apply summary suggestion
        ApplyAiSuggestionRequest summaryReq = new ApplyAiSuggestionRequest(
                "SUMMARY",
                "AI suggested optimized professional summary with measurable achievements.",
                "summary",
                "REPLACE",
                null
        );

        mockMvc.perform(post("/api/v1/resumes/" + resumeA.getId() + "/versions/" + version.getId() + "/apply-suggestion")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(summaryReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary").value("AI suggested optimized professional summary with measurable achievements."));

        // 2. Apply evidenced skill
        ApplyAiSuggestionRequest skillReq = new ApplyAiSuggestionRequest(
                "SKILL",
                "Apache Kafka",
                "skills",
                "APPEND",
                null
        );

        mockMvc.perform(post("/api/v1/resumes/" + resumeA.getId() + "/versions/" + version.getId() + "/apply-suggestion")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(skillReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skills").value(containsString("Apache Kafka")));
    }

    @Test
    @DisplayName("Export ATS-friendly PDF produces valid, parseable PDF document")
    void testExportVersionPdf() throws Exception {
        ResumeVersion version = resumeVersionRepository.save(new ResumeVersion(
                resumeA, userA, 1, "v1 - Target Google", "Principal Engineer", "Google",
                "Accomplished systems architect with 10+ years experience designing ultra low-latency cloud infrastructure.",
                "Java 21, Go, Kubernetes, Kafka, PostgreSQL, Distributed Systems",
                "• Designed distributed consensus service handling 250,000 transactions/sec\n• Reduced p99 tail latency from 85ms to 12ms",
                "M.S. in Distributed Systems, MIT (2018)",
                "• CloudRouter: Open-source packet routing engine",
                "AWS Certified Solutions Architect Professional",
                true,
                null
        ));

        MvcResult result = mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/versions/" + version.getId() + "/export-pdf")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString(".pdf")))
                .andReturn();

        byte[] pdfBytes = result.getResponse().getContentAsByteArray();
        assertThat(pdfBytes).isNotEmpty();

        // Verify PDF integrity and ATS text extractability with Apache PDFBox
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            PDFTextStripper stripper = new PDFTextStripper();
            String extractedText = stripper.getText(doc);
            assertThat(extractedText).contains("Alex Rivera");
            assertThat(extractedText).contains("Principal Engineer");
            assertThat(extractedText).contains("PROFESSIONAL SUMMARY");
            assertThat(extractedText).contains("TECHNICAL & PROFESSIONAL SKILLS");
            assertThat(extractedText).contains("WORK EXPERIENCE");
        }
    }

    @Test
    @DisplayName("Security & Isolation: User B cannot access, update, delete, or export User A's resume versions")
    void testCrossUserAccessPrevention() throws Exception {
        ResumeVersion versionA = resumeVersionRepository.save(new ResumeVersion(
                resumeA, userA, 1, "v1 - Private", "Secret Role", null,
                "Confidential info", "Skills", "Exp", "Edu", "Proj", null, true, null
        ));

        // 1. User B cannot list versions for User A's resume
        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/versions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // 2. User B cannot get User A's version
        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/versions/" + versionA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // 3. User B cannot update User A's version
        UpdateResumeVersionRequest hackReq = new UpdateResumeVersionRequest(
                "Hacked", null, null, null, null, null, null, null, null
        );
        mockMvc.perform(put("/api/v1/resumes/" + resumeA.getId() + "/versions/" + versionA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hackReq)))
                .andExpect(status().isNotFound());

        // 4. User B cannot duplicate User A's version
        mockMvc.perform(post("/api/v1/resumes/" + resumeA.getId() + "/versions/" + versionA.getId() + "/duplicate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // 5. User B cannot export User A's version PDF
        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/versions/" + versionA.getId() + "/export-pdf")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // 6. User B cannot delete User A's version
        mockMvc.perform(delete("/api/v1/resumes/" + resumeA.getId() + "/versions/" + versionA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // 7. Unauthenticated request returns 401
        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/versions/" + versionA.getId()))
                .andExpect(status().isUnauthorized());
    }
}
