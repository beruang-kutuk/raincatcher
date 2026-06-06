package com.raincatcher.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;

@Service
public class PasswordResetService {

    public static final String SAFE_FORGOT_PASSWORD_MESSAGE =
            "If this email exists, password reset instructions have been sent.";

    private static final int TOKEN_BYTES = 32;
    private static final int EXPIRY_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            @Value("${app.frontend-base-url:http://localhost:5173}") String frontendBaseUrl
    ) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.frontendBaseUrl = trimTrailingSlash(frontendBaseUrl == null ? "" : frontendBaseUrl.trim());
    }

    @Transactional
    public Map<String, String> requestReset(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
        if (email.isBlank()) {
            return safeResponse();
        }

        userRepository.findByEmailIgnoreCase(email)
                .filter(user -> "Active".equalsIgnoreCase(user.getStatus()))
                .ifPresent(user -> {
                    String token = generateToken();
                    PasswordResetTokenEntity entity = new PasswordResetTokenEntity();
                    entity.setUserId(user.getId());
                    entity.setTokenHash(hashToken(token));
                    entity.setCreatedAt(LocalDateTime.now());
                    entity.setExpiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES));
                    tokenRepository.save(entity);

                    String resetLink = frontendBaseUrl + "/reset-password?token=" + token;
                    emailService.sendPasswordResetEmail(user.getEmail(), resetLink, EXPIRY_MINUTES);
                });

        return safeResponse();
    }

    @Transactional
    public Map<String, String> resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Reset token is required.");
        }
        if (!isValidPassword(newPassword)) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }

        PasswordResetTokenEntity resetToken = tokenRepository.findByTokenHash(hashToken(token.trim()))
                .orElseThrow(() -> new IllegalArgumentException("Reset link is invalid or expired."));

        if (resetToken.getUsedAt() != null || resetToken.getExpiresAt() == null
                || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Reset link is invalid or expired.");
        }

        UserEntity user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Reset link is invalid or expired."));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setAuthProvider("PASSWORD");
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        tokenRepository.save(resetToken);

        return Map.of("message", "Password reset successfully.");
    }

    private Map<String, String> safeResponse() {
        return Map.of("message", SAFE_FORGOT_PASSWORD_MESSAGE);
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash reset token", ex);
        }
    }

    private boolean isValidPassword(String password) {
        return password != null && password.length() >= 8;
    }

    private String trimTrailingSlash(String value) {
        if (value.endsWith("/")) {
            return value.substring(0, value.length() - 1);
        }
        return value.isBlank() ? "http://localhost:5173" : value;
    }
}
