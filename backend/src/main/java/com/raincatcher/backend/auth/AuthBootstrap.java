package com.raincatcher.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AuthBootstrap implements ApplicationRunner {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final String bootstrapAdminPassword;

    public AuthBootstrap(
            AuthService authService,
            UserRepository userRepository,
            @Value("${raincatcher.bootstrap.admin-password:}") String bootstrapAdminPassword
    ) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.bootstrapAdminPassword = bootstrapAdminPassword == null ? "" : bootstrapAdminPassword.trim();
    }

    @Override
    public void run(ApplicationArguments args) {
        authService.ensureRoles();
        boolean hasSuperAdmin = userRepository.existsByRole(AuthService.ROLE_SUPER_ADMIN);
        if (hasSuperAdmin || bootstrapAdminPassword.isBlank()) {
            return;
        }

        UserEntity admin = new UserEntity();
        admin.setUsername("admin");
        admin.setEmail("admin@raincatcher.local");
        admin.setDisplayName("Super Admin");
        admin.setRole(AuthService.ROLE_SUPER_ADMIN);
        admin.setStatus("Active");
        authService.saveUser(admin, bootstrapAdminPassword);
    }
}
