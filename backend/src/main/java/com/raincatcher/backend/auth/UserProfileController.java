package com.raincatcher.backend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private static final Logger log = LoggerFactory.getLogger(UserProfileController.class);
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final List<String> ALLOWED_EXTENSIONS = List.of("jpg", "jpeg", "png", "webp");

    private final AuthService authService;
    private final String profileImageDir;

    public UserProfileController(
            AuthService authService,
            @Value("${profile.image.dir:/home/raincatcher/raincatcher-backend/profile-images}") String profileImageDir
    ) {
        this.authService = authService;
        this.profileImageDir = profileImageDir;
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

    @PostMapping(value = "/me/profile-picture/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadProfilePictureFile(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("file") MultipartFile file
    ) {
        try {
            String token = tokenFromHeader(authorization);
            UserEntity user = authService.getActiveUserByToken(token);

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Only image files are allowed."));
            }
            if (file.getSize() > MAX_IMAGE_BYTES) {
                return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Image must be under 5 MB."));
            }

            String ext = resolveExtension(file.getOriginalFilename(), contentType);
            String filename = user.getId() + "_" + System.currentTimeMillis() + "." + ext;

            Path dir = Paths.get(profileImageDir);
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            log.info("[User] Profile picture saved userId={} filename={}", user.getId(), filename);

            String imageUrl = "/api/users/profile-images/" + filename;
            return ResponseEntity.ok(authService.updateProfile(token, null, null, null, null, imageUrl));
        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to save profile picture."));
        } catch (Exception ex) {
            return unauthorized();
        }
    }

    @GetMapping("/profile-images/{filename}")
    public ResponseEntity<Resource> serveProfileImage(@PathVariable String filename) {
        try {
            String safeName = Paths.get(filename).getFileName().toString();
            Path filePath = Paths.get(profileImageDir).resolve(safeName);
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }
            String contentType = detectContentType(safeName);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (Exception ex) {
            return ResponseEntity.notFound().build();
        }
    }

    private String resolveExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
            if (ALLOWED_EXTENSIONS.contains(ext)) return ext;
        }
        if (contentType.contains("png")) return "png";
        if (contentType.contains("gif")) return "gif";
        if (contentType.contains("webp")) return "webp";
        return "jpg";
    }

    private String detectContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
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
