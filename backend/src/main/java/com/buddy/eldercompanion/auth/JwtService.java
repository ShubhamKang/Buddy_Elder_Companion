package com.buddy.eldercompanion.auth;

import com.buddy.eldercompanion.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;

/**
 * Issues and validates stateless JWT access tokens. Refresh tokens are opaque
 * random values managed by {@link AuthService} and persisted (hashed).
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long accessTtlMinutes;

    public JwtService(JwtProperties properties) {
        // The secret is Base64-encoded in config; decode to raw key bytes.
        byte[] keyBytes = Base64.getDecoder().decode(properties.secret());
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTtlMinutes = properties.accessTokenTtlMinutes();
    }

    /**
     * Generate a signed access token embedding the user id (subject), email and role.
     */
    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(accessTtlMinutes, ChronoUnit.MINUTES);
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    /**
     * Parse and validate a token, returning its claims. Throws a
     * {@link io.jsonwebtoken.JwtException} if the token is invalid or expired.
     */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
