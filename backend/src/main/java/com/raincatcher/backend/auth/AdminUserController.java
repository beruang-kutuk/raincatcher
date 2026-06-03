package com.raincatcher.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    public AdminUserController(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @GetMapping("/users")
    public ResponseEntity<?> users(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        return ResponseEntity.ok(userRepository.findAll().stream()
                .map(authService::publicUser)
                .toList());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody UserRequest request
    ) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        if (request == null || !hasText(request.password())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Password is required when creating a user"
            ));
        }
        UserEntity user = new UserEntity();
        user.setRole(AuthService.ROLE_LAB_ASSISTANT);
        user.setStatus("Active");
        apply(user, request);
        return ResponseEntity.ok(authService.publicUser(authService.saveUser(user, request.password())));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id,
            @RequestBody UserRequest request
    ) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        UserEntity user = userRepository.findById(id).orElseThrow();
        apply(user, request);
        return ResponseEntity.ok(authService.publicUser(authService.saveUser(user, request.password())));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id
    ) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        return userRepository.findById(id)
                .map((user) -> ResponseEntity.ok(authService.publicUser(user)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<?> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id,
            @RequestBody Map<String, String> request
    ) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        UserEntity user = userRepository.findById(id).orElseThrow();
        user.setStatus(authService.normaliseStatus(request.get("status")));
        return ResponseEntity.ok(authService.publicUser(authService.saveUser(user, null)));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id
    ) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/roles")
    public ResponseEntity<?> roles(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        return ResponseEntity.ok(authService.roles());
    }

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<?> updateRole(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id,
            @RequestBody Map<String, String> request
    ) {
        if (!isSuperAdmin(authorization)) return unauthorized();
        UserEntity user = userRepository.findById(id).orElseThrow();
        user.setRole(request.get("role"));
        return ResponseEntity.ok(authService.publicUser(authService.saveUser(user, null)));
    }

    private void apply(UserEntity user, UserRequest request) {
        if (request == null) return;
        if (hasText(request.username())) user.setUsername(request.username().trim());
        if (!hasText(request.username()) && hasText(request.email())) user.setUsername(request.email().trim());
        if (hasText(request.email())) user.setEmail(request.email().trim());
        if (hasText(request.displayName())) user.setDisplayName(request.displayName().trim());
        if (hasText(request.phone())) user.setPhone(request.phone().trim());
        if (hasText(request.role())) user.setRole(request.role().trim());
        if (hasText(request.status())) user.setStatus(authService.normaliseStatus(request.status()));
    }

    private boolean isSuperAdmin(String authorization) {
        try {
            authService.requireRole(tokenFromHeader(authorization), AuthService.ROLE_SUPER_ADMIN);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", "error",
                "message", "Super Admin session required"
        ));
    }

    private String tokenFromHeader(String authorization) {
        if (authorization == null) return "";
        return authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record UserRequest(
            String username,
            String email,
            String displayName,
            String phone,
            String role,
            String status,
            String password
    ) {
    }
}
