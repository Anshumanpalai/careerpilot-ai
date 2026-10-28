package com.careerpilot.controller;

import com.careerpilot.dto.CreateApplicationRequest;
import com.careerpilot.dto.UpdateApplicationRequest;
import com.careerpilot.dto.UpdateStatusRequest;
import com.careerpilot.entity.ApplicationStatus;
import com.careerpilot.entity.EmploymentType;
import com.careerpilot.entity.JobApplication;
import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import com.careerpilot.repository.JobApplicationRepository;
import com.careerpilot.repository.UserRepository;
import com.careerpilot.security.JwtTokenProvider;
import com.careerpilot.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class JobApplicationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JobApplicationRepository applicationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        applicationRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new User(
                "usera@example.com",
                passwordEncoder.encode("Password123!"),
                "User Alpha",
                UserRole.JOB_SEEKER,
                "Backend Engineer"
        ));

        userB = userRepository.save(new User(
                "userb@example.com",
                passwordEncoder.encode("Password123!"),
                "User Beta",
                UserRole.JOB_SEEKER,
                "Frontend Engineer"
        ));

        tokenA = generateToken(userA);
        tokenB = generateToken(userB);
    }

    private String generateToken(User user) {
        return jwtTokenProvider.generateToken(user);
    }

    @Test
    @DisplayName("POST /api/v1/applications should create application for authenticated user")
    void shouldCreateApplicationSuccessfully() throws Exception {
        CreateApplicationRequest request = new CreateApplicationRequest(
                "Stripe",
                "Backend Engineer",
                ApplicationStatus.APPLIED,
                "San Francisco, CA",
                EmploymentType.REMOTE,
                "https://stripe.com/jobs/123",
                "$180k - $220k",
                LocalDate.of(2026, 3, 15),
                "Strong referral from engineering lead",
                85
        );

        mockMvc.perform(post("/api/v1/applications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.companyName").value("Stripe"))
                .andExpect(jsonPath("$.jobTitle").value("Backend Engineer"))
                .andExpect(jsonPath("$.status").value("APPLIED"))
                .andExpect(jsonPath("$.location").value("San Francisco, CA"))
                .andExpect(jsonPath("$.employmentType").value("REMOTE"))
                .andExpect(jsonPath("$.salaryRange").value("$180k - $220k"))
                .andExpect(jsonPath("$.matchScore").value(85));

        assertThat(applicationRepository.countByUserId(userA.getId())).isEqualTo(1);
        assertThat(applicationRepository.countByUserId(userB.getId())).isEqualTo(0);
    }

    @Test
    @DisplayName("POST /api/v1/applications should reject invalid request with 400")
    void shouldRejectInvalidApplicationCreation() throws Exception {
        CreateApplicationRequest request = new CreateApplicationRequest(
                "", // Blank company name
                "", // Blank job title
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/applications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.companyName").isNotEmpty())
                .andExpect(jsonPath("$.validationErrors.jobTitle").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/v1/applications should only return current user's applications")
    void shouldListOnlyCurrentUserApplications() throws Exception {
        // Create 2 applications for User A
        JobApplication appA1 = applicationRepository.save(new JobApplication(
                userA, "Google", "Staff Engineer", ApplicationStatus.INTERVIEWING, "Mountain View",
                EmploymentType.HYBRID, null, "$250k+", LocalDate.now(), null, 90
        ));
        JobApplication appA2 = applicationRepository.save(new JobApplication(
                userA, "Meta", "Senior Engineer", ApplicationStatus.APPLIED, "Menlo Park",
                EmploymentType.REMOTE, null, "$220k+", LocalDate.now().minusDays(1), null, 85
        ));

        // Create 1 application for User B
        applicationRepository.save(new JobApplication(
                userB, "Amazon", "SDE II", ApplicationStatus.SCREENING, "Seattle",
                EmploymentType.FULL_TIME, null, "$170k+", LocalDate.now(), null, 80
        ));

        // User A requests applications
        mockMvc.perform(get("/api/v1/applications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].companyName").value("Google"))
                .andExpect(jsonPath("$[1].companyName").value("Meta"));

        // User B requests applications
        mockMvc.perform(get("/api/v1/applications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].companyName").value("Amazon"));
    }

    @Test
    @DisplayName("GET /api/v1/applications with filters should filter by status and query")
    void shouldFilterApplicationsByStatusAndQuery() throws Exception {
        applicationRepository.save(new JobApplication(
                userA, "Netflix", "Senior Platform Engineer", ApplicationStatus.INTERVIEWING, "Los Gatos",
                EmploymentType.HYBRID, null, null, LocalDate.now(), null, 92
        ));
        applicationRepository.save(new JobApplication(
                userA, "Apple", "iOS Software Engineer", ApplicationStatus.APPLIED, "Cupertino",
                EmploymentType.FULL_TIME, null, null, LocalDate.now(), null, 88
        ));

        // Filter by status INTERVIEWING
        mockMvc.perform(get("/api/v1/applications?status=INTERVIEWING")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].companyName").value("Netflix"));

        // Search by query "apple"
        mockMvc.perform(get("/api/v1/applications?query=apple")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].companyName").value("Apple"));
    }

    @Test
    @DisplayName("GET /api/v1/applications/{id} should deny cross-user access (returns 404)")
    void shouldDenyCrossUserAccessOnGet() throws Exception {
        JobApplication appA = applicationRepository.save(new JobApplication(
                userA, "Stripe", "Engineer", ApplicationStatus.APPLIED, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, 80
        ));

        // User B tries to access User A's application ID
        mockMvc.perform(get("/api/v1/applications/" + appA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("JobApplication not found with id: '" + appA.getId() + "'"));
    }

    @Test
    @DisplayName("PUT /api/v1/applications/{id} should update application for owner")
    void shouldUpdateApplicationSuccessfully() throws Exception {
        JobApplication appA = applicationRepository.save(new JobApplication(
                userA, "OpenAI", "ML Engineer", ApplicationStatus.APPLIED, "San Francisco",
                EmploymentType.HYBRID, null, "$200k", LocalDate.now(), "Initial notes", 85
        ));

        UpdateApplicationRequest updateRequest = new UpdateApplicationRequest(
                "OpenAI",
                "Senior ML Engineer",
                ApplicationStatus.SCREENING,
                "San Francisco, CA",
                EmploymentType.HYBRID,
                "https://openai.com/careers",
                "$240k - $280k",
                LocalDate.now(),
                "Recruiter reached out on LinkedIn",
                95
        );

        mockMvc.perform(put("/api/v1/applications/" + appA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitle").value("Senior ML Engineer"))
                .andExpect(jsonPath("$.status").value("SCREENING"))
                .andExpect(jsonPath("$.salaryRange").value("$240k - $280k"))
                .andExpect(jsonPath("$.matchScore").value(95));
    }

    @Test
    @DisplayName("PUT /api/v1/applications/{id} should deny cross-user update (returns 404)")
    void shouldDenyCrossUserUpdate() throws Exception {
        JobApplication appA = applicationRepository.save(new JobApplication(
                userA, "Databricks", "Software Engineer", ApplicationStatus.APPLIED, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, 75
        ));

        UpdateApplicationRequest maliciousUpdate = new UpdateApplicationRequest(
                "Hacked Corp", "Hacker", ApplicationStatus.OFFER, null, null, null, null, null, null, null
        );

        mockMvc.perform(put("/api/v1/applications/" + appA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousUpdate)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PATCH /api/v1/applications/{id}/status should update status")
    void shouldUpdateStatusSuccessfully() throws Exception {
        JobApplication appA = applicationRepository.save(new JobApplication(
                userA, "Airbnb", "Backend Engineer", ApplicationStatus.APPLIED, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, 80
        ));

        UpdateStatusRequest statusRequest = new UpdateStatusRequest(ApplicationStatus.INTERVIEWING);

        mockMvc.perform(patch("/api/v1/applications/" + appA.getId() + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERVIEWING"));
    }

    @Test
    @DisplayName("DELETE /api/v1/applications/{id} should delete application for owner")
    void shouldDeleteApplicationSuccessfully() throws Exception {
        JobApplication appA = applicationRepository.save(new JobApplication(
                userA, "Vercel", "Fullstack Engineer", ApplicationStatus.SAVED, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, 80
        ));

        mockMvc.perform(delete("/api/v1/applications/" + appA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isNoContent());

        assertThat(applicationRepository.findById(appA.getId())).isEmpty();
    }

    @Test
    @DisplayName("DELETE /api/v1/applications/{id} should deny cross-user deletion (returns 404)")
    void shouldDenyCrossUserDeletion() throws Exception {
        JobApplication appA = applicationRepository.save(new JobApplication(
                userA, "Vercel", "Fullstack Engineer", ApplicationStatus.SAVED, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, 80
        ));

        mockMvc.perform(delete("/api/v1/applications/" + appA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Application must still exist in database untouched
        assertThat(applicationRepository.findById(appA.getId())).isPresent();
    }

    @Test
    @DisplayName("Unauthenticated request to /api/v1/applications should return 401")
    void shouldRejectUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/api/v1/applications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/applications/stats should return accurate user statistics")
    void shouldReturnAccurateUserStats() throws Exception {
        applicationRepository.save(new JobApplication(
                userA, "Company 1", "Eng", ApplicationStatus.APPLIED, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, 80
        ));
        applicationRepository.save(new JobApplication(
                userA, "Company 2", "Eng", ApplicationStatus.INTERVIEWING, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, 90
        ));
        applicationRepository.save(new JobApplication(
                userA, "Company 3", "Eng", ApplicationStatus.OFFER, "Remote",
                EmploymentType.REMOTE, null, null, LocalDate.now(), null, null
        ));

        mockMvc.perform(get("/api/v1/applications/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplied").value(3))
                .andExpect(jsonPath("$.interviewsScheduled").value(1))
                .andExpect(jsonPath("$.offersReceived").value(1))
                .andExpect(jsonPath("$.averageMatchScore").value(85))
                .andExpect(jsonPath("$.weeklyGoalCompleted").value(3))
                .andExpect(jsonPath("$.weeklyGoalTarget").value(5));
    }
}
