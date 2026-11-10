package com.buddy.eldercompanion.auth;

import com.buddy.eldercompanion.auth.dto.LoginRequest;
import com.buddy.eldercompanion.auth.dto.RegisterRequest;
import com.buddy.eldercompanion.auth.dto.TokenResponse;
import com.buddy.eldercompanion.exception.BusinessRuleException;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.user.Role;
import com.buddy.eldercompanion.user.User;
import com.buddy.eldercompanion.user.UserRepository;
import com.buddy.eldercompanion.user.UserStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

/**
 * Orchestrates registration, login and refresh-token rotation.
 * <p>
 * Access tokens are stateless JWTs. Refresh tokens are opaque random strings;
 * only their SHA-256 hash is persisted, and each use rotates (revokes old,
 * issues new) to limit replay.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       JwtProperties jwtProperties) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
    }

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        if (request.role() == Role.ADMIN) {
            throw new BusinessRuleException("ADMIN accounts cannot be self-registered");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new BusinessRuleException("Email already registered");
        }
        User user = User.builder()
                .email(request.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .phone(request.phone())
                .role(request.role())
                .status(UserStatus.ACTIVE)
                .build();
        user = userRepository.save(user);
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessRuleException("Account is not active");
        }
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse refresh(String rawRefreshToken) {
        String hash = sha256(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        if (stored.isRevoked() || stored.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        // Rotate: revoke the used token and issue a fresh pair.
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return issueTokens(user);
    }

    private TokenResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefresh = generateRawRefreshToken();
        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(sha256(rawRefresh))
                .expiresAt(Instant.now().plus(jwtProperties.refreshTokenTtlDays(), ChronoUnit.DAYS))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);
        long accessTtlSeconds = jwtProperties.accessTokenTtlMinutes() * 60;
        return TokenResponse.bearer(accessToken, rawRefresh, accessTtlSeconds);
    }

    public User currentUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String generateRawRefreshToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
