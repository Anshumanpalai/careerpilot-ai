package com.careerpilot.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private static final String VALID_SECRET = "careerpilot-test-jwt-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256";

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", VALID_SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", 3600000L);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtIssuer", "careerpilot-test");
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("init should throw IllegalStateException when secret is less than 32 characters")
    void shouldRejectShortSecretKey() {
        JwtTokenProvider shortKeyProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(shortKeyProvider, "jwtSecret", "short_secret_under_32_chars");
        assertThatThrownBy(shortKeyProvider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 256 bits");
    }

    @Test
    @DisplayName("generateToken and validateToken should work for valid user claims")
    void shouldGenerateAndValidateToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "test@careerpilot.io", "JOB_SEEKER");

        assertThat(token).isNotEmpty();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo(userId);
        assertThat(jwtTokenProvider.getEmailFromToken(token)).isEqualTo("test@careerpilot.io");
        assertThat(jwtTokenProvider.getRoleFromToken(token)).isEqualTo("JOB_SEEKER");
    }

    @Test
    @DisplayName("validateToken should return false for tampered token")
    void shouldRejectTamperedToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "test@careerpilot.io", "JOB_SEEKER");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(jwtTokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    @DisplayName("validateToken should return false for null or empty token")
    void shouldRejectEmptyToken() {
        assertThat(jwtTokenProvider.validateToken(null)).isFalse();
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
        assertThat(jwtTokenProvider.validateToken("   ")).isFalse();
    }
}
