package com.careerpilot.service;

import com.careerpilot.dto.ResumeMatchRequest;
import com.careerpilot.dto.ResumeMatchResponse;
import com.careerpilot.dto.ScoreBreakdownDto;
import com.careerpilot.dto.SkillMatchDto;
import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.exception.BadRequestException;
import com.careerpilot.exception.ResourceNotFoundException;
import com.careerpilot.repository.ResumeRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic baseline resume-to-job description matching service.
 * <p>
 * Implements token-aware, boundary-safe skill extraction against a documented
 * technology dictionary and alias mapping. Distinguishes required versus preferred
 * job qualifications, extracts verbatim evidence snippets from resume text,
 * and calculates a reproducible weighted fit score with transparent limitations.
 */
@Service
@Transactional(readOnly = true)
public class ResumeJobMatchingService {

    private final ResumeRepository resumeRepository;

    public record SkillDefinition(String name, String category, List<String> aliases) {}

    // Documented, maintainable technical skill dictionary and alias catalog
    private static final List<SkillDefinition> SKILL_CATALOG = List.of(
            // Programming Languages
            new SkillDefinition("Java", "Programming Languages", List.of("Java", "Java 8", "Java 11", "Java 17", "Java 21")),
            new SkillDefinition("Python", "Programming Languages", List.of("Python", "Python 3", "Python3", "Py")),
            new SkillDefinition("JavaScript", "Programming Languages", List.of("JavaScript", "JS", "ECMAScript", "ES6")),
            new SkillDefinition("TypeScript", "Programming Languages", List.of("TypeScript", "TS")),
            new SkillDefinition("C++", "Programming Languages", List.of("C++", "CPP", "C Plus Plus")),
            new SkillDefinition("C#", "Programming Languages", List.of("C#", "CSharp", "C Sharp", ".NET C#")),
            new SkillDefinition("C", "Programming Languages", List.of("C")),
            new SkillDefinition("Go", "Programming Languages", List.of("Go", "Golang")),
            new SkillDefinition("Rust", "Programming Languages", List.of("Rust", "Rustlang")),
            new SkillDefinition("Ruby", "Programming Languages", List.of("Ruby")),
            new SkillDefinition("PHP", "Programming Languages", List.of("PHP", "PHP 8")),
            new SkillDefinition("Swift", "Programming Languages", List.of("Swift")),
            new SkillDefinition("Kotlin", "Programming Languages", List.of("Kotlin")),
            new SkillDefinition("Scala", "Programming Languages", List.of("Scala")),
            new SkillDefinition("SQL", "Programming Languages", List.of("SQL", "Structured Query Language")),
            new SkillDefinition("R", "Programming Languages", List.of("R", "R programming", "R language")),
            new SkillDefinition("Bash", "Programming Languages", List.of("Bash", "Shell", "Shell Scripting", "Bash Scripting", "Zsh")),

            // Markup Languages
            new SkillDefinition("HTML", "Markup Languages", List.of("HTML5", "HTML")),

            // Stylesheet Languages
            new SkillDefinition("CSS", "Stylesheet Languages", List.of("CSS3", "CSS")),

            // Frameworks & Libraries
            new SkillDefinition("Spring Boot", "Frameworks/Libraries", List.of("Spring Boot", "SpringBoot", "Spring-Boot", "Spring Framework", "Spring")),
            new SkillDefinition("React", "Frameworks/Libraries", List.of("React", "React.js", "ReactJS")),
            new SkillDefinition("Angular", "Frameworks/Libraries", List.of("Angular", "AngularJS", "Angular 2+")),
            new SkillDefinition("Vue", "Frameworks/Libraries", List.of("Vue", "Vue.js", "VueJS", "Vue 3")),
            new SkillDefinition("Next.js", "Frameworks/Libraries", List.of("Next.js", "Nextjs", "Next.JS")),
            new SkillDefinition("Node.js", "Frameworks/Libraries", List.of("Node.js", "Nodejs", "Node.JS", "Node")),
            new SkillDefinition("Express", "Frameworks/Libraries", List.of("Express", "Express.js", "ExpressJS")),
            new SkillDefinition("Django", "Frameworks/Libraries", List.of("Django")),
            new SkillDefinition("FastAPI", "Frameworks/Libraries", List.of("FastAPI", "Fast API")),
            new SkillDefinition("Flask", "Frameworks/Libraries", List.of("Flask")),
            new SkillDefinition("ASP.NET", "Frameworks/Libraries", List.of("ASP.NET", "ASP .NET", ".NET Core", ".NET 8", ".NET 6")),
            new SkillDefinition("GraphQL", "Frameworks/Libraries", List.of("GraphQL", "GQL")),
            new SkillDefinition("Tailwind CSS", "Frameworks/Libraries", List.of("Tailwind CSS", "Tailwind", "TailwindCSS")),

            // Databases & Storage
            new SkillDefinition("PostgreSQL", "Databases & Storage", List.of("PostgreSQL", "Postgres", "PSQL")),
            new SkillDefinition("MySQL", "Databases & Storage", List.of("MySQL")),
            new SkillDefinition("MongoDB", "Databases & Storage", List.of("MongoDB", "Mongo")),
            new SkillDefinition("Redis", "Databases & Storage", List.of("Redis")),
            new SkillDefinition("Elasticsearch", "Databases & Storage", List.of("Elasticsearch", "Elastic Search", "ELK")),
            new SkillDefinition("Cassandra", "Databases & Storage", List.of("Cassandra", "Apache Cassandra")),
            new SkillDefinition("DynamoDB", "Databases & Storage", List.of("DynamoDB", "Amazon DynamoDB")),
            new SkillDefinition("SQLite", "Databases & Storage", List.of("SQLite", "SQLite3")),
            new SkillDefinition("Snowflake", "Databases & Storage", List.of("Snowflake")),

            // Cloud & DevOps
            new SkillDefinition("AWS", "Cloud & DevOps", List.of("AWS", "Amazon Web Services", "Amazon AWS")),
            new SkillDefinition("Azure", "Cloud & DevOps", List.of("Azure", "Microsoft Azure")),
            new SkillDefinition("Google Cloud", "Cloud & DevOps", List.of("Google Cloud", "GCP", "Google Cloud Platform")),
            new SkillDefinition("Docker", "Cloud & DevOps", List.of("Docker", "Containerization", "Containers")),
            new SkillDefinition("Kubernetes", "Cloud & DevOps", List.of("Kubernetes", "K8s")),
            new SkillDefinition("Terraform", "Cloud & DevOps", List.of("Terraform")),
            new SkillDefinition("CI/CD", "Cloud & DevOps", List.of("CI/CD", "CI CD", "Continuous Integration", "Continuous Deployment", "Continuous Delivery")),
            new SkillDefinition("GitHub Actions", "Cloud & DevOps", List.of("GitHub Actions", "Github Actions", "GHA")),
            new SkillDefinition("Jenkins", "Cloud & DevOps", List.of("Jenkins")),
            new SkillDefinition("Linux", "Cloud & DevOps", List.of("Linux", "Unix", "Ubuntu", "Debian")),
            new SkillDefinition("Kafka", "Cloud & DevOps", List.of("Kafka", "Apache Kafka")),
            new SkillDefinition("RabbitMQ", "Cloud & DevOps", List.of("RabbitMQ")),
            new SkillDefinition("Nginx", "Cloud & DevOps", List.of("Nginx")),

            // Testing & Quality
            new SkillDefinition("JUnit", "Testing & QA", List.of("JUnit", "JUnit 5", "JUnit4")),
            new SkillDefinition("Mockito", "Testing & QA", List.of("Mockito")),
            new SkillDefinition("Jest", "Testing & QA", List.of("Jest")),
            new SkillDefinition("Vitest", "Testing & QA", List.of("Vitest")),
            new SkillDefinition("Cypress", "Testing & QA", List.of("Cypress")),
            new SkillDefinition("Playwright", "Testing & QA", List.of("Playwright")),
            new SkillDefinition("Selenium", "Testing & QA", List.of("Selenium")),
            new SkillDefinition("PyTest", "Testing & QA", List.of("PyTest", "pytest")),

            // Architecture & Engineering Practices
            new SkillDefinition("Microservices", "Architecture & Practices", List.of("Microservices", "Microservice", "Micro-services")),
            new SkillDefinition("REST APIs", "Architecture & Practices", List.of("REST APIs", "REST API", "RESTful", "REST", "RESTful APIs")),
            new SkillDefinition("System Design", "Architecture & Practices", List.of("System Design", "Distributed Systems", "Software Architecture")),
            new SkillDefinition("Agile", "Architecture & Practices", List.of("Agile", "Scrum", "Kanban")),
            new SkillDefinition("TDD", "Architecture & Practices", List.of("TDD", "Test-Driven Development", "Test Driven Development"))
    );

    // Section header patterns for classifying qualifications
    private static final Pattern PREFERRED_SECTION_HEADER = Pattern.compile(
            "^(?:#{1,6}\\s*)?(?:\\*{1,2}|_{1,2})?(?:preferred|desired|nice\\s+to\\s+have|bonus(?:\\s+points)?|plus(?:es)?|good\\s+to\\s+have|optional)(?:\\s+(?:qualifications|skills|requirements|experience|points))?[\\s:*_]*$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern REQUIRED_SECTION_HEADER = Pattern.compile(
            "^(?:#{1,6}\\s*)?(?:\\*{1,2}|_{1,2})?(?:(?:required|requirements|minimum|must\\s+have|basic|key)(?:\\s+(?:qualifications|skills|requirements|experience))?|core\\s+(?:qualifications|skills|requirements|experience)|what\\s+you(?:'ll|\\s+will)\\s+need|what\\s+we(?:'re|\\s+are)\\s+looking\\s+for)[\\s:*_]*$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern NEUTRAL_SECTION_HEADER = Pattern.compile(
            "^(?:#{1,6}\\s*)?(?:\\*{1,2}|_{1,2})?(?:about\\s+(?:us|the\\s+(?:role|job|opportunity|team|company))|responsibilities|core\\s+responsibilities|duties|what\\s+you(?:'ll|\\s+will)\\s+do|overview|summary|company\\s+overview|tech\\s+stack|technologies\\s+we\\s+use)[\\s:*_]*$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern LINE_HAS_PREFERRED_CUE = Pattern.compile(
            "(?i)(?:^\\s*[-*•]?\\s*(?:preferred|desired|nice\\s+to\\s+have|bonus(?:\\s+points)?|plus(?:es)?|good\\s+to\\s+have|optional)\\s*[:\\-])|" +
            "(?:\\b(?:is\\s+)?(?:preferred|preferable|preferably|a\\s+plus|pluses|bonus|optional|nice\\s+to\\s+have|good\\s+to\\s+have|desired|desirable)\\b)"
    );

    private static final Pattern LINE_HAS_REQUIRED_CUE = Pattern.compile(
            "(?i)(?:^\\s*[-*•]?\\s*(?:required|mandatory|must\\s+have|essential|minimum)\\s*[:\\-])|" +
            "(?:\\b(?:must\\s+have|must\\s+possess|is\\s+(?:required|mandatory|essential)|minimum\\s+\\d+\\+?\\s+years?)\\b)"
    );

    private enum SectionScope {
        NEUTRAL,
        REQUIRED,
        PREFERRED
    }

    public ResumeJobMatchingService(ResumeRepository resumeRepository) {
        this.resumeRepository = resumeRepository;
    }

    public ResumeMatchResponse matchResume(UUID userId, UUID resumeId, ResumeMatchRequest request) {
        if (request == null || request.jobDescription() == null || request.jobDescription().trim().isEmpty()) {
            throw new BadRequestException("Job description cannot be blank.");
        }

        String jobDescription = request.jobDescription().trim();
        if (jobDescription.length() < 50) {
            throw new BadRequestException("Job description must be at least 50 characters long.");
        }
        if (jobDescription.length() > 50000) {
            throw new BadRequestException("Job description cannot exceed 50,000 characters.");
        }

        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume", "id", resumeId));

        if (!resume.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to analyze this resume.");
        }

        if (resume.getStatus() != ResumeStatus.PARSED || resume.getRawText() == null || resume.getRawText().trim().isEmpty()) {
            throw new BadRequestException("The selected resume has not been parsed yet. Please parse the resume first before matching.");
        }

        return performAnalysis(resume, jobDescription);
    }

    /**
     * Internal matching logic, exposed package-private for deterministic unit testing.
     */
    ResumeMatchResponse performAnalysis(Resume resume, String jobDescription) {
        String resumeText = resume.getRawText() != null ? resume.getRawText() : "";

        // 1. Detect skills in Job Description with requirement tier (REQUIRED vs PREFERRED)
        Map<String, DetectedJobSkill> detectedJdSkills = extractJobDescriptionSkills(jobDescription);

        // 2. Evaluate each detected skill against resume text
        List<SkillMatchDto> matchedSkills = new ArrayList<>();
        List<SkillMatchDto> undetectedSkills = new ArrayList<>();

        int matchedRequired = 0;
        int totalRequired = 0;
        int matchedPreferred = 0;
        int totalPreferred = 0;

        for (DetectedJobSkill detected : detectedJdSkills.values()) {
            boolean isRequired = "REQUIRED".equalsIgnoreCase(detected.requirementType());
            if (isRequired) {
                totalRequired++;
            } else {
                totalPreferred++;
            }

            // Search resume for any alias of this skill
            String evidenceSnippet = findEvidenceSnippetInResume(detected.skillDef(), resumeText);
            boolean matched = evidenceSnippet != null;

            if (matched) {
                if (isRequired) {
                    matchedRequired++;
                } else {
                    matchedPreferred++;
                }
                matchedSkills.add(new SkillMatchDto(
                        detected.skillDef().name(),
                        detected.skillDef().category(),
                        detected.requirementType(),
                        true,
                        evidenceSnippet
                ));
            } else {
                undetectedSkills.add(new SkillMatchDto(
                        detected.skillDef().name(),
                        detected.skillDef().category(),
                        detected.requirementType(),
                        false,
                        null
                ));
            }
        }

        // Sort matched: Required first, then alphabetical
        matchedSkills.sort(Comparator.comparing(SkillMatchDto::requirementType).reversed()
                .thenComparing(SkillMatchDto::skillName));

        // Sort undetected: Required first, then alphabetical
        undetectedSkills.sort(Comparator.comparing(SkillMatchDto::requirementType).reversed()
                .thenComparing(SkillMatchDto::skillName));

        // 3. Compute deterministic score & breakdown
        ScoreBreakdownDto scoreBreakdown = calculateScore(
                matchedRequired, totalRequired, matchedPreferred, totalPreferred
        );

        // 4. Generate transparent recommendations
        List<String> recommendations = generateRecommendations(
                scoreBreakdown, matchedSkills, undetectedSkills
        );

        return new ResumeMatchResponse(
                resume.getId(),
                jobDescription.length(),
                scoreBreakdown.overallScore(),
                scoreBreakdown,
                matchedSkills,
                undetectedSkills,
                recommendations,
                Instant.now()
        );
    }

    /**
     * Extracts skills from the job description and determines whether each is Required or Preferred
     * based on section context and line-level semantic cues.
     */
    private Map<String, DetectedJobSkill> extractJobDescriptionSkills(String jobDescription) {
        String[] lines = jobDescription.split("\\r?\\n");
        SectionScope currentSection = SectionScope.NEUTRAL;
        Map<String, DetectedJobSkill> detectedMap = new LinkedHashMap<>();

        for (String line : lines) {
            String trimmedLine = line.trim();
            if (trimmedLine.isEmpty()) {
                continue;
            }

            // Check if line switches section state
            if (PREFERRED_SECTION_HEADER.matcher(trimmedLine).matches()) {
                currentSection = SectionScope.PREFERRED;
                continue;
            } else if (NEUTRAL_SECTION_HEADER.matcher(trimmedLine).matches()) {
                currentSection = SectionScope.NEUTRAL;
                continue;
            } else if (REQUIRED_SECTION_HEADER.matcher(trimmedLine).matches()) {
                currentSection = SectionScope.REQUIRED;
                continue;
            }

            // Determine line-level qualification tier
            String lineTier;
            if (LINE_HAS_PREFERRED_CUE.matcher(trimmedLine).find()) {
                lineTier = "PREFERRED";
            } else if (LINE_HAS_REQUIRED_CUE.matcher(trimmedLine).find()) {
                lineTier = "REQUIRED";
            } else if (currentSection == SectionScope.PREFERRED) {
                lineTier = "PREFERRED";
            } else if (currentSection == SectionScope.REQUIRED) {
                lineTier = "REQUIRED";
            } else {
                lineTier = "UNSPECIFIED";
            }

            // Scan line for all skills in catalog
            for (SkillDefinition skill : SKILL_CATALOG) {
                if (containsSkill(trimmedLine, skill)) {
                    DetectedJobSkill existing = detectedMap.get(skill.name());
                    if (existing == null) {
                        detectedMap.put(skill.name(), new DetectedJobSkill(skill, lineTier));
                    } else if ("UNSPECIFIED".equals(existing.requirementType())) {
                        // Refine unspecified skill when a concrete tier is encountered
                        if (!"UNSPECIFIED".equals(lineTier)) {
                            detectedMap.put(skill.name(), new DetectedJobSkill(skill, lineTier));
                        }
                    } else if ("PREFERRED".equals(existing.requirementType()) && "REQUIRED".equals(lineTier)) {
                        // Upgrade to REQUIRED if explicitly required elsewhere in the JD
                        detectedMap.put(skill.name(), new DetectedJobSkill(skill, "REQUIRED"));
                    }
                }
            }
        }

        // Resolve any remaining UNSPECIFIED skills to REQUIRED as baseline expectations
        Map<String, DetectedJobSkill> resolvedMap = new LinkedHashMap<>();
        for (Map.Entry<String, DetectedJobSkill> entry : detectedMap.entrySet()) {
            if ("UNSPECIFIED".equals(entry.getValue().requirementType())) {
                resolvedMap.put(entry.getKey(), new DetectedJobSkill(entry.getValue().skillDef(), "REQUIRED"));
            } else {
                resolvedMap.put(entry.getKey(), entry.getValue());
            }
        }

        // If no line-by-line skills detected, do full-text scan as REQUIRED baseline
        if (resolvedMap.isEmpty()) {
            for (SkillDefinition skill : SKILL_CATALOG) {
                if (containsSkill(jobDescription, skill)) {
                    resolvedMap.put(skill.name(), new DetectedJobSkill(skill, "REQUIRED"));
                }
            }
        }

        return resolvedMap;
    }

    /**
     * Checks if text contains any alias of the skill using token-safe regex boundaries.
     */
    public boolean containsSkill(String text, SkillDefinition skill) {
        if (text == null || text.isEmpty()) {
            return false;
        }

        for (String alias : skill.aliases()) {
            Pattern pattern = buildTokenBoundaryPattern(alias);
            if (pattern.matcher(text).find()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Builds boundary-aware regex to prevent substring false positives
     * (e.g. "C" in "CSS" or "React", "Go" in "Google", "Java" in "JavaScript").
     * Uses `(?<![A-Za-z0-9#+])` and `(?![A-Za-z0-9#+])` to respect special symbols
     * like C++, C#, .NET without false word-boundary collisions.
     * Prevents standalone "CSS" from falsely matching "Tailwind CSS".
     */
    public static Pattern buildTokenBoundaryPattern(String term) {
        if ("CSS".equalsIgnoreCase(term)) {
            // Avoid matching "CSS" when part of "Tailwind CSS"
            return Pattern.compile("(?<![A-Za-z0-9#+])(?<!Tailwind\\s+)(?i)" + Pattern.quote(term) + "(?![A-Za-z0-9#+])");
        }
        return Pattern.compile("(?<![A-Za-z0-9#+])(?i)" + Pattern.quote(term) + "(?![A-Za-z0-9#+])");
    }

    /**
     * Scans resume text for skill aliases and extracts a verbatim snippet containing the match.
     * Returns null if no match is found.
     */
    private String findEvidenceSnippetInResume(SkillDefinition skill, String resumeText) {
        if (resumeText == null || resumeText.isEmpty()) {
            return null;
        }

        for (String alias : skill.aliases()) {
            Pattern pattern = buildTokenBoundaryPattern(alias);
            Matcher matcher = pattern.matcher(resumeText);
            if (matcher.find()) {
                int matchStart = matcher.start();
                int matchEnd = matcher.end();

                // Extract a clean snippet around match (approx 120-140 chars)
                int start = Math.max(0, matchStart - 50);
                int end = Math.min(resumeText.length(), matchEnd + 70);

                // Adjust to whitespace boundary if possible
                while (start > 0 && !Character.isWhitespace(resumeText.charAt(start))) {
                    start--;
                }
                while (end < resumeText.length() && !Character.isWhitespace(resumeText.charAt(end))) {
                    end++;
                }

                String snippet = resumeText.substring(start, end).replaceAll("\\s+", " ").trim();
                if (start > 0) snippet = "..." + snippet;
                if (end < resumeText.length()) snippet = snippet + "...";

                return snippet;
            }
        }
        return null;
    }

    /**
     * Computes deterministic score based on detected required and preferred requirements.
     */
    private ScoreBreakdownDto calculateScore(
            int matchedRequired, int totalRequired, int matchedPreferred, int totalPreferred
    ) {
        int overallScore;
        double requiredRate = totalRequired > 0 ? (matchedRequired * 100.0) / totalRequired : 0.0;
        double preferredRate = totalPreferred > 0 ? (matchedPreferred * 100.0) / totalPreferred : 0.0;

        if (totalRequired > 0 && totalPreferred > 0) {
            // Weighted formula: 80% on required requirements, 20% on preferred requirements
            overallScore = (int) Math.round((matchedRequired * 80.0 / totalRequired) + (matchedPreferred * 20.0 / totalPreferred));
        } else if (totalRequired > 0) {
            // Only required requirements present
            overallScore = (int) Math.round((matchedRequired * 100.0 / totalRequired));
        } else if (totalPreferred > 0) {
            // Only preferred requirements present
            overallScore = (int) Math.round((matchedPreferred * 100.0 / totalPreferred));
        } else {
            // No catalog technical requirements found in JD
            overallScore = 0;
        }

        overallScore = Math.max(0, Math.min(100, overallScore));

        String explanation = "Weighted baseline: 80% weight on required qualifications + 20% weight on preferred qualifications (or 100% when only one category is present in job description).";

        List<String> limitations = List.of(
                "Deterministic keyword and alias matcher: Evaluates specific technical terms and aliases detected in raw document text, not candidate competency or seniority.",
                "Not an official ATS endorsement: Different Applicant Tracking Systems parse and weigh resumes using distinct, proprietary vendor criteria.",
                "Absence does not imply incompetence: Unmatched skills simply reflect terms omitted from the document, not necessarily a lack of personal capability.",
                "Zero generative hallucination: Evidence snippets are strictly verbatim excerpts from the parsed resume text without AI extrapolation."
        );

        return new ScoreBreakdownDto(
                overallScore,
                Math.round(requiredRate * 10.0) / 10.0,
                Math.round(preferredRate * 10.0) / 10.0,
                matchedRequired,
                totalRequired,
                matchedPreferred,
                totalPreferred,
                explanation,
                limitations
        );
    }

    /**
     * Generates practical, honest recommendations based on detected requirements and gaps.
     */
    private List<String> generateRecommendations(
            ScoreBreakdownDto scoreBreakdown,
            List<SkillMatchDto> matchedSkills,
            List<SkillMatchDto> undetectedSkills
    ) {
        List<String> recommendations = new ArrayList<>();

        List<String> undetectedRequired = undetectedSkills.stream()
                .filter(s -> "REQUIRED".equalsIgnoreCase(s.requirementType()))
                .map(SkillMatchDto::skillName)
                .toList();

        List<String> undetectedPreferred = undetectedSkills.stream()
                .filter(s -> "PREFERRED".equalsIgnoreCase(s.requirementType()))
                .map(SkillMatchDto::skillName)
                .toList();

        if (!undetectedRequired.isEmpty()) {
            String skillsPreview = String.join(", ", undetectedRequired.stream().limit(4).toList());
            if (undetectedRequired.size() > 4) {
                skillsPreview += " and " + (undetectedRequired.size() - 4) + " more";
            }
            recommendations.add("Consider explicitly listing your hands-on experience with core requirement(s): " + skillsPreview + " if you possess practical proficiency.");
        }

        if (!undetectedPreferred.isEmpty()) {
            String prefPreview = String.join(", ", undetectedPreferred.stream().limit(3).toList());
            recommendations.add("Highlighting preferred qualification(s): " + prefPreview + " could help differentiate your resume for this role.");
        }

        if (scoreBreakdown.totalRequiredCount() == 0 && scoreBreakdown.totalPreferredCount() == 0) {
            recommendations.add("No catalog technical skills were detected in the pasted job description. Paste a detailed job description containing technical requirements, qualifications, or tech stack mentions.");
        } else if (matchedSkills.isEmpty()) {
            recommendations.add("None of the technical requirements detected in the job description were found in your parsed resume. Review and tailor your resume's technical skills and project descriptions for this role.");
        } else if (scoreBreakdown.overallScore() >= 80) {
            recommendations.add("Strong technical keyword alignment detected (≥80%). Focus on articulating business outcomes, metrics (e.g. latency, scale, revenue), and team leadership in your bullet points.");
        } else if (scoreBreakdown.overallScore() < 50) {
            recommendations.add("Keyword match is below 50%. Review the job's core responsibilities and ensure your relevant project bullet points mention applicable technologies.");
        }

        return recommendations;
    }

    private record DetectedJobSkill(SkillDefinition skillDef, String requirementType) {}
}
