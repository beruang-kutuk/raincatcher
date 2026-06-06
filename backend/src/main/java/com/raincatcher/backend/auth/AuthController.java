package com.raincatcher.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService service, PasswordResetService passwordResetService) {
        this.service = service;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            return ResponseEntity.ok(service.login(
                    request.getOrDefault("username", ""),
                    request.getOrDefault("password", "")
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "Invalid username or password"
            ));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody(required = false) GoogleLoginRequest request) {
        try {
            String credential = request == null ? "" : request.credential();
            return ResponseEntity.ok(service.loginWithGoogle(credential));
        } catch (AuthService.GoogleLoginDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "status", "error",
                    "message", ex.getMessage()
            ));
        } catch (AuthService.GoogleLoginRejectedException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", ex.getMessage()
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "Google login failed"
            ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        service.logout(tokenFromHeader(authorization));
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody(required = false) ForgotPasswordRequest request) {
        String email = request == null ? "" : request.email();
        return ResponseEntity.ok(passwordResetService.requestReset(email));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody(required = false) ResetPasswordRequest request) {
        try {
            String token = request == null ? "" : request.token();
            String newPassword = request == null ? "" : request.newPassword();
            return ResponseEntity.ok(passwordResetService.resetPassword(token, newPassword));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", ex.getMessage()
            ));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            return ResponseEntity.ok(service.me(tokenFromHeader(authorization)));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "No active session"
            ));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, String> request
    ) {
        try {
            String token = tokenFromHeader(authorization);
            return ResponseEntity.ok(service.updateProfile(
                    token,
                    request.get("displayName"),
                    request.get("phone"),
                    request.get("email"),
                    request.get("password"),
                    request.get("avatarUrl")
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "No active session or update failed"
            ));
        }
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, String> request
    ) {
        try {
            String token = tokenFromHeader(authorization);
            String avatarUrl = request.getOrDefault("avatarUrl", "");
            if (avatarUrl.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "avatarUrl is required"));
            }
            return ResponseEntity.ok(service.updateProfile(token, null, null, null, null, avatarUrl));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "error",
                    "message", "No active session or avatar update failed"
            ));
        }
    }

    private String tokenFromHeader(String authorization) {
        if (authorization == null) return "";
        return authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
    }
}
