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
