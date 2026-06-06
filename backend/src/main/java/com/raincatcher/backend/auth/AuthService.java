package com.raincatcher.backend.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";
    public static final String ROLE_LAB_ASSISTANT = "LAB_ASSISTANT";

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean googleLoginEnabled;
    private final String googleClientId;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;

    public AuthService(
            UserRepository userRepository,
            UserSessionRepository sessionRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            @Value("${google.login.enabled:false}") boolean googleLoginEnabled,
            @Value("${google.client-id:}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.googleLoginEnabled = googleLoginEnabled;
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.googleIdTokenVerifier = this.googleClientId.isBlank()
                ? null
                : new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(List.of(this.googleClientId))
                        .build();
    }

    @Transactional
    public Map<String, Object> login(String username, String password) {
        UserEntity user = userRepository.findByUsernameOrEmail(username, username)
                .filter(candidate -> "Active".equalsIgnoreCase(candidate.getStatus()))
                .filter(candidate -> isAllowedRole(candidate.getRole()))
                .filter(candidate -> candidate.getPasswordHash() != null && !candidate.getPasswordHash().isBlank())
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                .orElseThrow();

        return createSessionResponse(user);
    }

    @Transactional
    public Map<String, Object> loginWithGoogle(String credential) {
        if (!googleLoginEnabled) {
            throw new GoogleLoginDisabledException("Google login is disabled");
        }
        if (googleClientId.isBlank() || googleIdTokenVerifier == null) {
            throw new GoogleLoginDisabledException("Google login is not configured");
        }
        if (!hasText(credential)) {
            throw new GoogleLoginRejectedException("Google credential is required");
        }

        GoogleIdToken idToken;
        try {
            idToken = googleIdTokenVerifier.verify(credential.trim());
        } catch (GeneralSecurityException | IOException ex) {
            throw new GoogleLoginRejectedException("Google credential could not be verified");
        }
        if (idToken == null) {
            throw new GoogleLoginRejectedException("Google credential is invalid");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = trimToEmpty(payload.getEmail()).toLowerCase(Locale.ROOT);
        String subject = trimToEmpty(payload.getSubject());
        Long expiresAt = payload.getExpirationTimeSeconds();
        if (!hasText(email) || !hasText(subject)) {
            throw new GoogleLoginRejectedException("Google credential is missing identity details");
        }
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new GoogleLoginRejectedException("Google account email is not verified");
        }
        if (expiresAt == null || expiresAt <= Instant.now().getEpochSecond()) {
            throw new GoogleLoginRejectedException("Google credential has expired");
        }

        String displayName = trimToEmpty((String) payload.get("name"));
        String pictureUrl = trimToEmpty((String) payload.get("picture"));
        UserEntity user = findOrCreateGoogleUser(email, subject, displayName, pictureUrl);
        return createSessionResponse(user);
    }

    @Transactional
    public void logout(String token) {
        if (token == null || token.isBlank()) return;
        sessionRepository.findByTokenAndActiveTrue(token).ifPresent(session -> {
            session.setActive(false);
            sessionRepository.save(session);
        });
    }

    public Map<String, Object> me(String token) {
        return publicUser(getActiveUserByToken(token));
    }

    public UserEntity getActiveUserByToken(String token) {
        UserSessionEntity session = sessionRepository.findByTokenAndActiveTrue(token).orElseThrow();
        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setActive(false);
            sessionRepository.save(session);
            throw new IllegalArgumentException("Session expired");
        }

        UserEntity user = userRepository.findById(session.getUserId()).orElseThrow();
        if (!"Active".equalsIgnoreCase(user.getStatus()) || !isAllowedRole(user.getRole())) {
            throw new IllegalArgumentException("User is not active");
        }
        return user;
    }

    public void requireRole(String token, String role) {
        UserEntity user = getActiveUserByToken(token);
        if (!role.equals(user.getRole())) {
            throw new IllegalArgumentException("Forbidden");
        }
    }

    @Transactional
    public UserEntity saveUser(UserEntity incoming, String password) {
        incoming.setRole(normaliseRole(incoming.getRole()));
        if (!isAllowedRole(incoming.getRole())) {
            throw new IllegalArgumentException("Unsupported role");
        }
        LocalDateTime now = LocalDateTime.now();
        if (incoming.getId() == null) {
            incoming.setCreatedAt(now);
        }
        incoming.setUpdatedAt(now);
        incoming.setStatus(normaliseStatus(incoming.getStatus()));
        if (password != null && !password.isBlank()) {
            incoming.setPasswordHash(passwordEncoder.encode(password));
            if (!hasText(incoming.getAuthProvider())) {
                incoming.setAuthProvider("PASSWORD");
            }
        }
        return userRepository.save(incoming);
    }

    public List<String> roles() {
        ensureRoles();
        return List.of(ROLE_SUPER_ADMIN, ROLE_LAB_ASSISTANT);
    }

    @Transactional
    public void ensureRoles() {
        ensureRole(ROLE_SUPER_ADMIN, "Super Admin");
        ensureRole(ROLE_LAB_ASSISTANT, "Lab Assistant");
    }

    public Map<String, Object> publicUser(UserEntity user) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("username", user.getUsername() == null ? "" : user.getUsername());
        result.put("email", user.getEmail() == null ? "" : user.getEmail());
        result.put("displayName", user.getDisplayName() == null ? "" : user.getDisplayName());
        result.put("phone", user.getPhone() == null ? "" : user.getPhone());
        result.put("role", normaliseRole(user.getRole()));
        result.put("status", user.getStatus() == null ? "" : user.getStatus());
        result.put("authProvider", hasText(user.getAuthProvider()) ? user.getAuthProvider() : "PASSWORD");
        String profileImage = firstText(user.getProfileImageUrl(), user.getProfileImageData(), user.getAvatarUrl());
        result.put("avatarUrl", profileImage);
        result.put("profileImageUrl", user.getProfileImageUrl() == null ? "" : user.getProfileImageUrl());
        result.put("profileImageData", user.getProfileImageData() == null ? "" : user.getProfileImageData());
        return result;
    }

    @Transactional
    public Map<String, Object> updateProfile(String token, String displayName, String phone, String email, String password, String avatarUrl) {
        UserEntity user = getActiveUserByToken(token);
        if (displayName != null && !displayName.isBlank()) user.setDisplayName(displayName.trim());
        if (phone != null && !phone.isBlank()) user.setPhone(phone.trim());
        if (email != null && !email.isBlank()) user.setEmail(email.trim());
        if (avatarUrl != null && !avatarUrl.isBlank()) {
            String trimmedUrl = avatarUrl.trim();
            user.setAvatarUrl(trimmedUrl);
            user.setProfileImageUrl(trimmedUrl);
            if (!trimmedUrl.startsWith("data:")) {
                user.setProfileImageData(null);
            }
        }
        return publicUser(saveUser(user, (password != null && !password.isBlank()) ? password : null));
    }

    @Transactional
    public Map<String, Object> updateProfilePicture(String token, String profileImageUrl, String profileImageData) {
        UserEntity user = getActiveUserByToken(token);
        if (profileImageData != null && !profileImageData.isBlank()) {
            user.setProfileImageData(profileImageData.trim());
            user.setAvatarUrl(profileImageData.trim());
        }
        if (profileImageUrl != null && !profileImageUrl.isBlank()) {
            user.setProfileImageUrl(profileImageUrl.trim());
            user.setAvatarUrl(profileImageUrl.trim());
        }
        return publicUser(saveUser(user, null));
    }

    public boolean isAllowedRole(String role) {
        return ROLE_SUPER_ADMIN.equals(role) || ROLE_LAB_ASSISTANT.equals(role);
    }

    public String normaliseRole(String role) {
        if (ROLE_SUPER_ADMIN.equals(role)) return ROLE_SUPER_ADMIN;
        if (ROLE_LAB_ASSISTANT.equals(role)) return ROLE_LAB_ASSISTANT;
        return role == null ? "" : role;
    }

    public String normaliseStatus(String status) {
        if (status == null || status.isBlank()) return "Active";
        if ("ACTIVE".equalsIgnoreCase(status) || "Active".equalsIgnoreCase(status)) return "Active";
        if ("SUSPENDED".equalsIgnoreCase(status) || "Suspended".equalsIgnoreCase(status)) return "Suspended";
        if ("PENDING".equalsIgnoreCase(status) || "Pending".equalsIgnoreCase(status)) return "Pending";
        return status;
    }

    private void ensureRole(String roleKey, String label) {
        roleRepository.findByRoleKey(roleKey).orElseGet(() -> {
            RoleEntity role = new RoleEntity();
            role.setRoleKey(roleKey);
            role.setLabel(label);
            return roleRepository.save(role);
        });
    }

    private Map<String, Object> createSessionResponse(UserEntity user) {
        LocalDateTime now = LocalDateTime.now();
        UserSessionEntity session = new UserSessionEntity();
        session.setUserId(user.getId());
        session.setToken(UUID.randomUUID().toString());
        session.setActive(true);
        session.setCreatedAt(now);
        session.setExpiresAt(now.plusDays(7));
        sessionRepository.save(session);

        user.setLastLoginAt(now);
        userRepository.save(user);

        return Map.of(
                "token", session.getToken(),
                "role", user.getRole(),
                "user", publicUser(user)
        );
    }

    private UserEntity findOrCreateGoogleUser(String email, String subject, String displayName, String pictureUrl) {
        Optional<UserEntity> bySub = userRepository.findByGoogleSub(subject);
        Optional<UserEntity> existing = bySub.isPresent() ? bySub : userRepository.findByEmailIgnoreCase(email);

        if (existing.isEmpty()) {
            UserEntity user = new UserEntity();
            user.setUsername(uniqueUsernameFromEmail(email));
            user.setEmail(email);
            user.setDisplayName(hasText(displayName) ? displayName : emailLocalPart(email));
            user.setRole(ROLE_LAB_ASSISTANT);
            user.setStatus("Active");
            user.setAuthProvider("GOOGLE");
            user.setGoogleSub(subject);
            if (hasText(pictureUrl)) {
                user.setProfileImageUrl(pictureUrl);
                user.setAvatarUrl(pictureUrl);
            }
            return saveUser(user, null);
        }

        UserEntity user = existing.get();
        if (!"Active".equalsIgnoreCase(user.getStatus()) || !isAllowedRole(user.getRole())) {
            throw new GoogleLoginRejectedException("User account is not active");
        }
        if (hasText(user.getGoogleSub()) && !subject.equals(user.getGoogleSub())) {
            throw new GoogleLoginRejectedException("Google account is not linked to this user");
        }

        user.setAuthProvider("GOOGLE");
        user.setGoogleSub(subject);
        if (!hasText(user.getEmail())) {
            user.setEmail(email);
        }
        if (!hasText(user.getDisplayName()) && hasText(displayName)) {
            user.setDisplayName(displayName);
        }
        if (hasText(pictureUrl) && !hasText(user.getProfileImageUrl()) && !hasText(user.getProfileImageData())) {
            user.setProfileImageUrl(pictureUrl);
            user.setAvatarUrl(pictureUrl);
        }
        return saveUser(user, null);
    }

    private String uniqueUsernameFromEmail(String email) {
        String base = emailLocalPart(email)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "");
        if (!hasText(base)) {
            base = "google-user";
        }
        String candidate = base;
        int suffix = 2;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String emailLocalPart(String email) {
        if (!hasText(email)) return "google-user";
        int at = email.indexOf("@");
        return at > 0 ? email.substring(0, at) : email;
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    public static class GoogleLoginDisabledException extends RuntimeException {
        public GoogleLoginDisabledException(String message) {
            super(message);
        }
    }

    public static class GoogleLoginRejectedException extends RuntimeException {
        public GoogleLoginRejectedException(String message) {
            super(message);
        }
    }
}
