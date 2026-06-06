package com.raincatcher.backend.auth;

public record ResetPasswordRequest(String token, String newPassword) {
}
