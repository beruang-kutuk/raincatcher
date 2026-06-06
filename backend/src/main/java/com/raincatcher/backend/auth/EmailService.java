package com.raincatcher.backend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String smtpUsername;
    private final String smtpPassword;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String smtpUsername,
            @Value("${spring.mail.password:}") String smtpPassword
    ) {
        this.mailSender = mailSender;
        this.smtpUsername = smtpUsername == null ? "" : smtpUsername.trim();
        this.smtpPassword = smtpPassword == null ? "" : smtpPassword.trim();
    }

    public boolean isConfigured() {
        return !smtpUsername.isBlank() && !smtpPassword.isBlank();
    }

    public void sendPasswordResetEmail(String to, String resetLink, int expiryMinutes) {
        if (!isConfigured()) {
            log.warn("[Auth] SMTP not configured; password reset email not sent.");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(smtpUsername);
        message.setTo(to);
        message.setSubject("Raincatcher Password Reset");
        message.setText("""
                You requested a Raincatcher password reset.

                Use this link to reset your password:
                %s

                This link expires in %d minutes.

                If you did not request this, you can ignore this email.
                """.formatted(resetLink, expiryMinutes));
        try {
            mailSender.send(message);
            log.info("[Auth] Password reset email sent to {}", to);
        } catch (Exception ex) {
            log.error("[Auth] Failed to send password reset email to {}: {}", to, ex.getMessage());
        }
    }
}
