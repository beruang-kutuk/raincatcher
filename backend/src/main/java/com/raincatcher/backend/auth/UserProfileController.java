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
@RequestMapping("/api/users")
public class UserProfileController {

    private final AuthService authService;

    public UserProfileController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            return ResponseEntity.ok(authService.me(tokenFromHeader(authorization)));
        } catch (Exception ex) {
            return unauthorized();
        }
    }

    @PutMapping("/me/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, String> request
    ) {
        try {
            Map<String, String> safe = request == null ? Map.of() : request;
            return ResponseEntity.ok(authService.updateProfile(
                    tokenFromHeader(authorization),
                    safe.get("displayName"),
                    safe.get("phone"),
                    safe.get("email"),
                    safe.get("password"),
                    safe.get("profileImageUrl")
            ));
        } catch (Exception ex) {
            return unauthorized();
        }
    }

    @PostMapping("/me/profile-picture")
    public ResponseEntity<?> updateProfilePicture(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, String> request
    ) {
        try {
            Map<String, String> safe = request == null ? Map.of() : request;
            String imageData = safe.get("profileImageData");
            String imageUrl = safe.getOrDefault("profileImageUrl", safe.get("avatarUrl"));
            if ((imageData == null || imageData.isBlank()) && (imageUrl == null || imageUrl.isBlank())) {
                return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "profileImageUrl or profileImageData is required"));
            }
            return ResponseEntity.ok(authService.updateProfilePicture(tokenFromHeader(authorization), imageUrl, imageData));
        } catch (Exception ex) {
            return unauthorized();
        }
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", "error",
                "message", "No active session"
        ));
    }

    private String tokenFromHeader(String authorization) {
        if (authorization == null) return "";
        return authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
    }
}
