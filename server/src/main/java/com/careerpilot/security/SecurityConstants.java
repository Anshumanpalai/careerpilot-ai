package com.careerpilot.security;

public final class SecurityConstants {

    public static final String AUTH_HEADER = "Authorization";
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_ROLE = "role";

    private SecurityConstants() {
        // Utility class
    }
}
