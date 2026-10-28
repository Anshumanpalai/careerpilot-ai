package com.careerpilot.service;

import com.careerpilot.dto.ResumeMatchRequest;
import com.careerpilot.dto.ResumeMatchResponse;
import com.careerpilot.dto.SkillMatchDto;
import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import com.careerpilot.exception.BadRequestException;
import com.careerpilot.exception.ResourceNotFoundException;
import com.careerpilot.repository.ResumeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeJobMatchingServiceTest {

    @Mock
    private ResumeRepository resumeRepository;

    private ResumeJobMatchingService matchingService;

    private User owner;
    private User otherUser;
    private Resume parsedResume;
    private UUID resumeId;

    @BeforeEach
    void setUp() {
        matchingService = new ResumeJobMatchingService(resumeRepository);

        owner = new User("owner@example.com", "pass", "Owner", UserRole.JOB_SEEKER, "Engineer");
        owner.setId(UUID.randomUUID());

        otherUser = new User("other@example.com", "pass", "Other", UserRole.JOB_SEEKER, "PM");
        otherUser.setId(UUID.randomUUID());

        resumeId = UUID.randomUUID();
        parsedResume = new Resume(owner, "resume.pdf", "storage_key", "application/pdf", 1024L, ResumeStatus.PARSED);
        parsedResume.setId(resumeId);
        parsedResume.setRawText("""
                Senior Software Engineer with 6 years experience in Java 17, Spring Boot, and PostgreSQL.
                Built scalable microservices and REST APIs deployed on Docker and Kubernetes.
                Wrote unit tests with JUnit 5 and Mockito. Familiar with CI/CD pipelines.
                """);
    }

    @Test
    @DisplayName("Successfully matches resume with required and preferred qualifications and evidence snippets")
    void shouldMatchResumeSuccessfully() {
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(parsedResume));

        String jobDescription = """
                Requirements:
                - Strong experience in Java and Spring Boot microservices
                - Solid understanding of PostgreSQL and relational databases
                - Experience with Docker and Kubernetes
                
                Preferred Qualifications:
                - Experience with Python and AWS cloud deployments
                - Knowledge of Kafka and Redis
                """;

        ResumeMatchResponse response = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        assertThat(response).isNotNull();
        assertThat(response.resumeId()).isEqualTo(resumeId);
        assertThat(response.matchScore()).isGreaterThan(0);
        assertThat(response.scoringBreakdown()).isNotNull();

        // Required skills: Java, Spring Boot, Microservices, PostgreSQL, Docker, Kubernetes
        // Preferred skills: Python, AWS, Kafka, Redis
        assertThat(response.matchedSkills())
                .extracting(SkillMatchDto::skillName)
                .contains("Java", "Spring Boot", "PostgreSQL", "Docker", "Kubernetes", "Microservices");

        // Undetected skills: Python, AWS, Kafka, Redis
        assertThat(response.undetectedSkills())
                .extracting(SkillMatchDto::skillName)
                .contains("Python", "AWS", "Kafka", "Redis");

        // Evidence snippets must be present on matched skills and null on undetected skills
        SkillMatchDto javaMatch = response.matchedSkills().stream()
                .filter(s -> "Java".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(javaMatch.matched()).isTrue();
        assertThat(javaMatch.snippet()).contains("Java");

        SkillMatchDto pythonUndetected = response.undetectedSkills().stream()
                .filter(s -> "Python".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(pythonUndetected.matched()).isFalse();
        assertThat(pythonUndetected.snippet()).isNull();

        // Limitations and formula explanation must be transparent
        assertThat(response.scoringBreakdown().formulaExplanation()).isNotEmpty();
        assertThat(response.scoringBreakdown().limitations()).isNotEmpty();
        assertThat(response.recommendations()).isNotEmpty();
    }

    @Test
    @DisplayName("Token-aware boundary regex avoids false positives (C vs C++, Go vs Google, Java vs JavaScript, SQL vs NoSQL)")
    void shouldAvoidFalsePositivesFromSubstrings() {
        Resume boundaryResume = new Resume(owner, "test.pdf", "key", "application/pdf", 500L, ResumeStatus.PARSED);
        boundaryResume.setId(resumeId);
        // This resume mentions Google, JavaScript, NoSQL, and CSS — but NOT Go, Java, SQL, or C
        boundaryResume.setRawText("""
                Frontend specialist at Google working on modern web interfaces.
                Expertise in JavaScript, TypeScript, CSS, and React.
                Experience integrating with NoSQL document databases like MongoDB.
                """);

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(boundaryResume));

        String jobDescription = """
                Requirements:
                - Systems engineering in Go and C
                - Backend services in Java and SQL databases
                """;

        ResumeMatchResponse response = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        // Go, C, Java, SQL must NOT match against Google, JavaScript, NoSQL, or CSS
        assertThat(response.matchedSkills()).isEmpty();
        assertThat(response.undetectedSkills())
                .extracting(SkillMatchDto::skillName)
                .contains("Go", "C", "Java", "SQL");
        assertThat(response.matchScore()).isEqualTo(0);
    }

    @Test
    @DisplayName("Correctly recognizes technology aliases (e.g. K8s for Kubernetes, Postgres for PostgreSQL, SpringBoot)")
    void shouldRecognizeKnownAliases() {
        Resume aliasResume = new Resume(owner, "resume.pdf", "key", "application/pdf", 500L, ResumeStatus.PARSED);
        aliasResume.setId(resumeId);
        aliasResume.setRawText("""
                Cloud engineer with expertise in K8s, Postgres, SpringBoot, and GHA.
                Proficient in Golang and TS.
                """);

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(aliasResume));

        String jobDescription = """
                Requirements:
                - Kubernetes and PostgreSQL
                - Spring Boot and GitHub Actions
                - Go and TypeScript
                """;

        ResumeMatchResponse response = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        assertThat(response.matchedSkills())
                .extracting(SkillMatchDto::skillName)
                .containsExactlyInAnyOrder("Kubernetes", "PostgreSQL", "Spring Boot", "GitHub Actions", "Go", "TypeScript");
        assertThat(response.undetectedSkills()).isEmpty();
        assertThat(response.matchScore()).isEqualTo(100);
    }

    @Test
    @DisplayName("Honest handling of resumes with no detectable skills")
    void shouldHandleResumeWithNoDetectableSkillsHonestAndAccurate() {
        Resume emptySkillsResume = new Resume(owner, "resume.pdf", "key", "application/pdf", 500L, ResumeStatus.PARSED);
        emptySkillsResume.setId(resumeId);
        emptySkillsResume.setRawText("Managed restaurant operations, staff scheduling, inventory orders, and customer service.");

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(emptySkillsResume));

        String jobDescription = """
                Requirements:
                - Python, Django, Docker, and PostgreSQL
                """;

        ResumeMatchResponse response = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        assertThat(response.matchedSkills()).isEmpty();
        assertThat(response.undetectedSkills()).hasSize(4);
        assertThat(response.matchScore()).isEqualTo(0);
        assertThat(response.scoringBreakdown().requiredMatchRate()).isEqualTo(0.0);
        assertThat(response.recommendations())
                .anyMatch(rec -> rec.contains("None of the technical requirements detected"));
    }

    @Test
    @DisplayName("Returns stable deterministic score for identical inputs")
    void shouldReturnStableScoreForIdenticalInputs() {
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(parsedResume));

        String jobDescription = """
                Requirements:
                - Java, Spring Boot, PostgreSQL, Docker
                Preferred:
                - Python, AWS
                """;

        ResumeMatchResponse response1 = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));
        ResumeMatchResponse response2 = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        assertThat(response1.matchScore()).isEqualTo(response2.matchScore());
        assertThat(response1.scoringBreakdown().requiredMatchRate()).isEqualTo(response2.scoringBreakdown().requiredMatchRate());
        assertThat(response1.scoringBreakdown().preferredMatchRate()).isEqualTo(response2.scoringBreakdown().preferredMatchRate());
        assertThat(response1.matchedSkills()).hasSameSizeAs(response2.matchedSkills());
        assertThat(response1.undetectedSkills()).hasSameSizeAs(response2.undetectedSkills());
    }

    @Test
    @DisplayName("Rejects access when user is not the owner of the resume (cross-user rejection)")
    void shouldRejectCrossUserAccess() {
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(parsedResume));

        assertThatThrownBy(() -> matchingService.matchResume(
                otherUser.getId(),
                resumeId,
                new ResumeMatchRequest("Requirements:\n- Java and Spring Boot for cloud backend systems.")
        ))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You do not have permission to analyze this resume.");
    }

    @Test
    @DisplayName("Rejects when resume does not exist")
    void shouldThrowNotFoundWhenResumeMissing() {
        UUID missingId = UUID.randomUUID();
        when(resumeRepository.findById(missingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> matchingService.matchResume(
                owner.getId(),
                missingId,
                new ResumeMatchRequest("Requirements:\n- Java and Spring Boot for cloud backend systems.")
        ))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Rejects matching if resume has not been parsed yet")
    void shouldRejectWhenResumeNotParsed() {
        Resume unparsedResume = new Resume(owner, "file.pdf", "key", "application/pdf", 100L, ResumeStatus.UPLOADED);
        unparsedResume.setId(resumeId);
        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(unparsedResume));

        assertThatThrownBy(() -> matchingService.matchResume(
                owner.getId(),
                resumeId,
                new ResumeMatchRequest("Requirements:\n- Java and Spring Boot for cloud backend systems.")
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("The selected resume has not been parsed yet.");
    }

    @Test
    @DisplayName("Validates empty or blank job descriptions")
    void shouldRejectEmptyOrBlankJobDescription() {
        assertThatThrownBy(() -> matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest("   ")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Job description cannot be blank.");

        assertThatThrownBy(() -> matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(null)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Job description cannot be blank.");
    }

    @Test
    @DisplayName("Validates job description length constraints (too short or excessively long)")
    void shouldRejectInvalidJobDescriptionLength() {
        // Less than 50 characters
        assertThatThrownBy(() -> matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest("Need a developer")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least 50 characters long");

        // More than 50,000 characters
        String tooLong = "A".repeat(50001);
        assertThatThrownBy(() -> matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(tooLong)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot exceed 50,000 characters");
    }

    @Test
    @DisplayName("Regression: HTML5 and CSS3 match canonical HTML/CSS with verbatim snippets and corrected categories")
    void shouldCorrectlyMatchHtml5AndCss3WithCanonicalNamesAndVerbatimSnippets() {
        Resume webResume = new Resume(owner, "web_resume.pdf", "key", "application/pdf", 500L, ResumeStatus.PARSED);
        webResume.setId(resumeId);
        webResume.setRawText("""
                Frontend Engineer proficient in modern web applications.
                Core Skills: HTML5, CSS3, JavaScript, React.
                Developed responsive layouts with clean HTML5 markup and modern CSS3 animations.
                """);

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(webResume));

        String jobDescription = """
                Requirements:
                - Strong understanding of HTML and CSS for web interfaces
                - Experience with JavaScript and React
                """;

        ResumeMatchResponse response = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        // HTML
        SkillMatchDto htmlMatch = response.matchedSkills().stream()
                .filter(s -> "HTML".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(htmlMatch.matched()).isTrue();
        assertThat(htmlMatch.category()).isEqualTo("Markup Languages");
        assertThat(htmlMatch.snippet()).contains("HTML5"); // Verbatim excerpt from resume

        // CSS
        SkillMatchDto cssMatch = response.matchedSkills().stream()
                .filter(s -> "CSS".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(cssMatch.matched()).isTrue();
        assertThat(cssMatch.category()).isEqualTo("Stylesheet Languages");
        assertThat(cssMatch.snippet()).contains("CSS3"); // Verbatim excerpt from resume

        // React & JavaScript categories
        SkillMatchDto jsMatch = response.matchedSkills().stream()
                .filter(s -> "JavaScript".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(jsMatch.category()).isEqualTo("Programming Languages");

        SkillMatchDto reactMatch = response.matchedSkills().stream()
                .filter(s -> "React".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(reactMatch.category()).isEqualTo("Frameworks/Libraries");
    }

    @Test
    @DisplayName("Regression: Strict boundary checks prevent false positives (Java vs JavaScript, C vs CSS, CSS vs Tailwind CSS)")
    void shouldPreventSubstringFalsePositivesForCriticalTechnologies() {
        // Resume with only JavaScript and Tailwind CSS (no Java, no C, no standalone CSS)
        Resume boundaryResume = new Resume(owner, "boundary.pdf", "key", "application/pdf", 500L, ResumeStatus.PARSED);
        boundaryResume.setId(resumeId);
        boundaryResume.setRawText("""
                Frontend developer specialized in JavaScript and Tailwind CSS.
                Designed responsive user interfaces using pure Tailwind CSS utility classes.
                """);

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(boundaryResume));

        String jobDescription = """
                Requirements:
                - Java backend service development
                - Low level systems programming in C
                - Custom stylesheet design with CSS
                """;

        ResumeMatchResponse response = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        // None of Java, C, or standalone CSS should match JavaScript or Tailwind CSS
        assertThat(response.matchedSkills()).isEmpty();
        assertThat(response.undetectedSkills())
                .extracting(SkillMatchDto::skillName)
                .containsExactlyInAnyOrder("Java", "C", "CSS");
    }

    @Test
    @DisplayName("Regression: Required vs Preferred classification respects section context and line cues")
    void shouldAccuratelyClassifyRequiredVsPreferredBasedOnJdWording() {
        Resume candidateResume = new Resume(owner, "candidate.pdf", "key", "application/pdf", 500L, ResumeStatus.PARSED);
        candidateResume.setId(resumeId);
        candidateResume.setRawText("""
                Full stack developer with experience in React, TypeScript, Java, and Docker.
                Built microservices and scalable web applications.
                """);

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(candidateResume));

        String jobDescription = """
                Core Responsibilities:
                - Build modern user interfaces using React and collaborate with Java engineers.
                
                Minimum Qualifications:
                - 3+ years experience with React and TypeScript
                
                Preferred Qualifications:
                - Familiarity with backend development using Java
                - Experience with Docker containerization is a plus
                - Knowledge of Kubernetes is nice to have
                """;

        ResumeMatchResponse response = matchingService.matchResume(owner.getId(), resumeId, new ResumeMatchRequest(jobDescription));

        // React and TypeScript must be REQUIRED
        SkillMatchDto reactMatch = response.matchedSkills().stream()
                .filter(s -> "React".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(reactMatch.requirementType()).isEqualTo("REQUIRED");

        SkillMatchDto tsMatch = response.matchedSkills().stream()
                .filter(s -> "TypeScript".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(tsMatch.requirementType()).isEqualTo("REQUIRED");

        // Java was mentioned in Core Responsibilities, but explicitly listed under Preferred Qualifications
        // It must be classified as PREFERRED, not locked to REQUIRED
        SkillMatchDto javaMatch = response.matchedSkills().stream()
                .filter(s -> "Java".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(javaMatch.requirementType()).isEqualTo("PREFERRED");

        // Docker had "is a plus" in preferred section -> PREFERRED
        SkillMatchDto dockerMatch = response.matchedSkills().stream()
                .filter(s -> "Docker".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(dockerMatch.requirementType()).isEqualTo("PREFERRED");

        // Kubernetes had "nice to have" in preferred section -> PREFERRED (undetected)
        SkillMatchDto k8sUndetected = response.undetectedSkills().stream()
                .filter(s -> "Kubernetes".equals(s.skillName()))
                .findFirst().orElseThrow();
        assertThat(k8sUndetected.requirementType()).isEqualTo("PREFERRED");
    }
}
