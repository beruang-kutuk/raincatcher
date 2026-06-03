package com.raincatcher.backend.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";
    public static final String ROLE_LAB_ASSISTANT = "LAB_ASSISTANT";

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            UserSessionRepository sessionRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Map<String, Object> login(String username, String password) {
        UserEntity user = userRepository.findByUsernameOrEmail(username, username)
                .filter(candidate -> "Active".equalsIgnoreCase(candidate.getStatus()))
                .filter(candidate -> isAllowedRole(candidate.getRole()))
                .filter(candidate -> candidate.getPasswordHash() != null && !candidate.getPasswordHash().isBlank())
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                .orElseThrow();

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
        String profileImage = firstText(user.getProfileImageData(), user.getProfileImageUrl(), user.getAvatarUrl());
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
            user.setAvatarUrl(avatarUrl.trim());
            user.setProfileImageUrl(avatarUrl.trim());
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

    private String firstText(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }
}
