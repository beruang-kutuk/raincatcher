import { buildBackendUrl } from "./apiConfig";
import type { UserRole } from "../auth/rbac";

export type AuthUser = {
    id: number;
    username: string;
    email: string;
    displayName: string;
    phone: string;
    role: UserRole;
    status: string;
    authProvider?: string;
    avatarUrl?: string;
    profileImageUrl?: string;
    profileImageData?: string;
};

export type LoginResponse = {
    token: string;
    role: UserRole;
    user: AuthUser;
};

export async function loginWithBackend(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(buildBackendUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
        throw new Error("Backend login failed");
    }
    return (await response.json()) as LoginResponse;
}

export async function loginWithGoogle(credential: string): Promise<LoginResponse> {
    const response = await fetch(buildBackendUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
    });
    if (!response.ok) {
        throw new Error(await readAuthError(response, "Google login failed"));
    }
    return (await response.json()) as LoginResponse;
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
    const response = await fetch(buildBackendUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error("Backend session is invalid");
    }
    return (await response.json()) as AuthUser;
}

export async function logoutWithBackend(token: string) {
    await fetch(buildBackendUrl("/api/auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
}

export type ProfileUpdatePayload = {
    displayName?: string;
    phone?: string;
    email?: string;
    password?: string;
    avatarUrl?: string;
};

export async function updateProfile(token: string, payload: ProfileUpdatePayload): Promise<AuthUser> {
    const response = await fetch(buildBackendUrl("/api/auth/me"), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error("Profile update failed");
    }
    return (await response.json()) as AuthUser;
}

export async function uploadAvatar(token: string, avatarUrl: string): Promise<AuthUser> {
    const response = await fetch(buildBackendUrl("/api/auth/avatar"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarUrl }),
    });
    if (!response.ok) {
        throw new Error("Avatar update failed");
    }
    return (await response.json()) as AuthUser;
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await fetch(buildBackendUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    if (!response.ok) {
        throw new Error(await readAuthError(response, "Password reset request failed"));
    }
    return (await response.json()) as { message: string };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(buildBackendUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
    });
    if (!response.ok) {
        throw new Error(await readAuthError(response, "Password reset failed"));
    }
    return (await response.json()) as { message: string };
}

async function readAuthError(response: Response, fallback: string) {
    try {
        const body = (await response.json()) as { message?: string };
        return body.message || fallback;
    } catch {
        return fallback;
    }
}
