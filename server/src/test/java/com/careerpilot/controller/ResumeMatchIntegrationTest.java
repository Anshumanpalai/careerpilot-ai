package com.careerpilot.controller;

import com.careerpilot.dto.ResumeMatchRequest;
import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.repository.UserRepository;
import com.careerpilot.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ResumeMatchIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResumeRepository resumeRepository;

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
    private Resume parsedResumeA;
    private Resume unparsedResumeA;

    @BeforeEach
    void setUp() {
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
                "storage_key_alpha",
                "application/pdf",
                2048L,
                ResumeStatus.PARSED
        );
        parsedResumeA.setRawText("""
                Senior Software Engineer with proficiency in Java, Spring Boot, PostgreSQL, and Docker.
                Designed and maintained distributed microservices handling 10k requests per second.
                Experienced in automated testing using JUnit and Mockito.
                """);
        parsedResumeA = resumeRepository.save(parsedResumeA);

        unparsedResumeA = new Resume(
                userA,
                "alpha_unparsed.pdf",
                "storage_key_unparsed",
                "application/pdf",
                1024L,
                ResumeStatus.UPLOADED
        );
        unparsedResumeA = resumeRepository.save(unparsedResumeA);
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/match - Successfully analyzes resume against job description")
    void shouldMatchResumeSuccessfully() throws Exception {
        String jobDescription = """
                We are seeking a Senior Backend Engineer to join our team.
                Requirements:
                - Strong expertise in Java and Spring Boot
                - Solid relational database design using PostgreSQL
                - Experience deploying containerized applications with Docker
                
                Preferred Qualifications:
                - Familiarity with AWS and Kubernetes
                - Experience with Redis caching
                """;

        ResumeMatchRequest request = new ResumeMatchRequest(jobDescription);

        mockMvc.perform(post("/api/v1/resumes/" + parsedResumeA.getId() + "/match")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeId").value(parsedResumeA.getId().toString()))
                .andExpect(jsonPath("$.matchScore").isNumber())
                .andExpect(jsonPath("$.scoringBreakdown").exists())
                .andExpect(jsonPath("$.scoringBreakdown.overallScore").isNumber())
                .andExpect(jsonPath("$.scoringBreakdown.requiredMatchRate").isNumber())
                .andExpect(jsonPath("$.scoringBreakdown.preferredMatchRate").isNumber())
                .andExpect(jsonPath("$.scoringBreakdown.formulaExplanation").isString())
                .andExpect(jsonPath("$.scoringBreakdown.limitations", not(empty())))
                .andExpect(jsonPath("$.matchedSkills", not(empty())))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'Java')].matched").value(true))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'Java')].snippet", notNullValue()))
                .andExpect(jsonPath("$.undetectedSkills[?(@.skillName == 'AWS')].matched").value(false))
                .andExpect(jsonPath("$.recommendations", not(empty())))
                .andExpect(jsonPath("$.analyzedAt").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/match - Rejects access when requesting another user's resume (403 Forbidden)")
    void shouldRejectCrossUserAccess() throws Exception {
        String jobDescription = "Requirements: Strong expertise in Java and Spring Boot for cloud applications.";
        ResumeMatchRequest request = new ResumeMatchRequest(jobDescription);

        mockMvc.perform(post("/api/v1/resumes/" + parsedResumeA.getId() + "/match")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Access is denied."));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/match - Rejects unauthenticated request (401 Unauthorized)")
    void shouldRejectUnauthenticatedRequest() throws Exception {
        String jobDescription = "Requirements: Strong expertise in Java and Spring Boot for cloud applications.";
        ResumeMatchRequest request = new ResumeMatchRequest(jobDescription);

        mockMvc.perform(post("/api/v1/resumes/" + parsedResumeA.getId() + "/match")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/match - Returns 404 when resume ID does not exist")
    void shouldReturn404WhenResumeNotFound() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        String jobDescription = "Requirements: Strong expertise in Java and Spring Boot for cloud applications.";
        ResumeMatchRequest request = new ResumeMatchRequest(jobDescription);

        mockMvc.perform(post("/api/v1/resumes/" + nonExistentId + "/match")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/match - Returns 400 when resume is not parsed yet")
    void shouldReturn400WhenResumeNotParsed() throws Exception {
        String jobDescription = "Requirements: Strong expertise in Java and Spring Boot for cloud applications.";
        ResumeMatchRequest request = new ResumeMatchRequest(jobDescription);

        mockMvc.perform(post("/api/v1/resumes/" + unparsedResumeA.getId() + "/match")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("not been parsed yet")));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/match - Returns 400 when job description is blank or too short")
    void shouldReturn400WhenJobDescriptionInvalid() throws Exception {
        // Blank
        ResumeMatchRequest blankRequest = new ResumeMatchRequest("   ");
        mockMvc.perform(post("/api/v1/resumes/" + parsedResumeA.getId() + "/match")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(blankRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // Too short (< 50 characters)
        ResumeMatchRequest shortRequest = new ResumeMatchRequest("Need a developer");
        mockMvc.perform(post("/api/v1/resumes/" + parsedResumeA.getId() + "/match")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shortRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/match - Successfully analyzes realistic ~2,000 character job description against parsed resume")
    void shouldSuccessfullyAnalyzeRealisticLargeJobDescription() throws Exception {
        // Resume with skills matching the user's resume.pdf profile
        Resume fullResume = new Resume(
                userA,
                "resume.pdf",
                "storage_key_realistic",
                "application/pdf",
                1024L,
                ResumeStatus.PARSED
        );
        fullResume.setRawText("""
                Frontend Developer with strong knowledge of Java, Data Structures & Algorithms (DSA), and problem solving.
                Experienced in building responsive, component-based web applications using React.js, JavaScript, HTML5, CSS3,
                and Tailwind CSS. Familiar with REST APIs, basic backend development, Git/GitHub, and UI/UX principles.
                SMG Frontend Developer Intern: Developed Road Safety Web Application using React.js, Tailwind CSS, and REST APIs.
                Bachelor of Engineering in Computer Science and Engineering.
                Technical Skills: Java, JavaScript, HTML5, CSS3, React.js, Tailwind CSS, REST APIs, Git, GitHub, Figma.
                Certifications: Python for Data Science, AI and Development.
                """);
        fullResume = resumeRepository.save(fullResume);

        String realisticJd = """
                Senior Frontend & Fullstack Software Engineer

                About the Opportunity:
                CareerPilot AI is seeking an accomplished Frontend Software Engineer to design, architect, and deliver intuitive,
                high-performance web applications that transform career navigation. In this role, you will lead the evolution of
                our design system, streamline complex client-side workflows, and integrate asynchronous REST APIs with sub-second responsiveness.

                Core Responsibilities:
                - Architect and develop modern, component-based user interfaces in React.js, TypeScript, and Tailwind CSS.
                - Build clean, reusable component libraries adhering to accessibility (WCAG 2.1 AA) and modern UI/UX design standards.
                - Integrate complex REST APIs and manage client state using React Hooks and Context API.
                - Collaborate closely with Product Designers in Figma to translate wireframes into interactive prototypes.
                - Collaborate with backend engineers developing Java and Spring Boot services to align on API schemas and contracts.
                - Write robust unit and integration tests using Vitest, Jest, and Cypress to maintain high test coverage.
                - Optimize web applications for desktop, tablet, and mobile devices, ensuring cross-browser compatibility and maximum performance.
                - Champion code quality, perform constructive code reviews, and mentor junior engineers in problem solving and Data Structures & Algorithms.

                Minimum Qualifications:
                - 4+ years of professional web development experience with JavaScript, HTML5, and CSS3.
                - Proven experience with React.js, modern React Hooks, and component-based frontend architecture.
                - Demonstrated experience working with REST APIs and asynchronous data fetching.
                - Strong foundation in Object-Oriented Programming (OOP) and Problem Solving.
                - Proficient in Git, GitHub, and collaborative pull-request workflows.

                Preferred Qualifications:
                - Familiarity with backend development using Java or Node.js.
                - Prior experience with Figma design token systems.
                - Experience with Docker containerization and CI/CD pipelines (GitHub Actions).
                - Exposure to Next.js or server-side rendering patterns.
                """;

        assertThat(realisticJd.length()).isBetween(1900, 2200);

        ResumeMatchRequest request = new ResumeMatchRequest(realisticJd);

        mockMvc.perform(post("/api/v1/resumes/" + fullResume.getId() + "/match")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeId").value(fullResume.getId().toString()))
                .andExpect(jsonPath("$.matchScore").isNumber())
                .andExpect(jsonPath("$.matchedSkills", not(empty())))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'React')].matched").value(true))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'React')].category").value("Frameworks/Libraries"))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'JavaScript')].matched").value(true))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'JavaScript')].category").value("Programming Languages"))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'JavaScript')].requirementType").value("REQUIRED"))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'HTML')].snippet").value(hasItem(containsString("HTML5"))))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'CSS')].snippet").value(hasItem(containsString("CSS3"))))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'Tailwind CSS')].matched").value(hasItem(true)))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'Java')].matched").value(hasItem(true)))
                .andExpect(jsonPath("$.matchedSkills[?(@.skillName == 'REST APIs')].matched").value(hasItem(true)))
                .andExpect(jsonPath("$.scoringBreakdown.limitations", not(empty())))
                .andExpect(jsonPath("$.recommendations", not(empty())));
    }

    @Test
    @DisplayName("GET /api/v1/unmapped-endpoint - Returns 404 Not Found via NoResourceFoundException handler")
    void shouldReturn404ForUnmappedEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/unmapped-endpoint-test")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(containsString("does not exist")));
    }
}
