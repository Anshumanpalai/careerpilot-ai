package com.careerpilot.controller;

import com.careerpilot.dto.LoginRequest;
import com.careerpilot.dto.RegisterRequest;
import com.careerpilot.entity.User;
import com.careerpilot.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("POST /api/v1/auth/register should create user with hashed password and return JWT")
    void shouldRegisterUserSuccessfully() throws Exception {
        RegisterRequest request = new RegisterRequest(
                "Jane Doe",
                "  JANE.DOE@example.com  ",
                "Password123!",
                "Senior Software Engineer"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.user.id").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("jane.doe@example.com"))
                .andExpect(jsonPath("$.user.fullName").value("Jane Doe"))
                .andExpect(jsonPath("$.user.role").value("JOB_SEEKER"))
                .andExpect(jsonPath("$.user.targetRole").value("Senior Software Engineer"))
                .andExpect(jsonPath("$.user.password").doesNotExist())
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();

        // Verify database persistence and password hashing
        User savedUser = userRepository.findByEmailIgnoreCase("jane.doe@example.com").orElseThrow();
        assertThat(savedUser.getPasswordHash()).isNotEqualTo("Password123!");
        assertThat(savedUser.getPasswordHash()).startsWith("$2a$");
        assertThat(passwordEncoder.matches("Password123!", savedUser.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("POST /api/v1/auth/register with duplicate email should return HTTP 409 Conflict")
    void shouldRejectDuplicateEmailRegistration() throws Exception {
        RegisterRequest initialRequest = new RegisterRequest(
                "First User",
                "duplicate@example.com",
                "Password123!",
                "Engineer"
        );
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initialRequest)))
                .andExpect(status().isCreated());

        RegisterRequest duplicateRequest = new RegisterRequest(
                "Second User",
                "DUPLICATE@EXAMPLE.COM",
                "Password999!",
                "Designer"
        );
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already exists")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register with invalid data should return HTTP 400 Bad Request")
    void shouldRejectInvalidRegistrationPayload() throws Exception {
        RegisterRequest shortPasswordRequest = new RegisterRequest(
                "Jane Doe",
                "jane@example.com",
                "short", // min 8 required
                "Engineer"
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shortPasswordRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.password").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with valid credentials should return HTTP 200 and JWT")
    void shouldLoginSuccessfullyWithValidCredentials() throws Exception {
        RegisterRequest register = new RegisterRequest(
                "Alex Mercer",
                "alex@careerpilot.io",
                "StrongPassword123!",
                "Staff Engineer"
        );
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated());

        LoginRequest login = new LoginRequest("ALEX@careerpilot.io", "StrongPassword123!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.user.email").value("alex@careerpilot.io"))
                .andExpect(jsonPath("$.user.fullName").value("Alex Mercer"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with invalid password should return HTTP 401 Unauthorized")
    void shouldRejectLoginWithWrongPassword() throws Exception {
        RegisterRequest register = new RegisterRequest(
                "Alex Mercer",
                "alex.auth@careerpilot.io",
                "StrongPassword123!",
                "Staff Engineer"
        );
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated());

        LoginRequest login = new LoginRequest("alex.auth@careerpilot.io", "WrongPassword!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with non-existent email should return HTTP 401 Unauthorized")
    void shouldRejectLoginWithNonExistentEmail() throws Exception {
        LoginRequest login = new LoginRequest("nonexistent@careerpilot.io", "AnyPassword123!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me without JWT token should return HTTP 401 Unauthorized")
    void shouldRejectGetMeWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me with invalid JWT token should return HTTP 401 Unauthorized")
    void shouldRejectGetMeWithMalformedToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer invalid.malformed.jwt.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me with valid JWT token should return authenticated user profile")
    void shouldReturnProfileWithValidJwt() throws Exception {
        RegisterRequest register = new RegisterRequest(
                "Session User",
                "session.user@example.com",
                "Password123!",
                "Cloud Architect"
        );
        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode jsonNode = objectMapper.readTree(registerResult.getResponse().getContentAsString());
        String token = jsonNode.get("token").asText();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("session.user@example.com"))
                .andExpect(jsonPath("$.fullName").value("Session User"))
                .andExpect(jsonPath("$.targetRole").value("Cloud Architect"));
    }

    @Test
    @DisplayName("GET /api/v1/health should remain publicly accessible without authentication")
    void healthCheckShouldRemainPublic() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("GET /api-docs should remain publicly accessible without authentication")
    void openApiDocsShouldRemainPublic() throws Exception {
        mockMvc.perform(get("/api-docs"))
                .andExpect(status().isOk());
    }
}
