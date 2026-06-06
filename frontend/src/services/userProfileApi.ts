import { buildBackendUrl } from "./apiConfig";
import type { AuthUser, ProfileUpdatePayload } from "./authApi";

export async function uploadUserProfilePictureFile(file: File): Promise<AuthUser> {
    const token = localStorage.getItem("rc_token");
    const formData = new FormData();
    formData.append("file", file);
    let response: Response;
    try {
        response = await fetch(buildBackendUrl("/api/users/me/profile-picture/upload"), {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
    } catch {
        throw new Error("Unable to reach the server. Check your connection.");
    }
    if (!response.ok) {
        if (response.status === 401) throw new Error("Your session has expired. Please log in again.");
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || `Upload failed (${response.status})`);
    }
    return response.json() as Promise<AuthUser>;
}

async function userProfileJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    const response = await fetch(buildBackendUrl(path), {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Your session has expired. Please log in again.");
        }
        throw new Error(`User profile request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export function getUserProfile() {
    return userProfileJson<AuthUser>("/api/auth/me");
}

export function updateUserProfile(payload: ProfileUpdatePayload) {
    return userProfileJson<AuthUser>("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function uploadUserProfilePicture(profileImageData: string) {
    return userProfileJson<AuthUser>("/api/auth/avatar", {
        method: "POST",
        body: JSON.stringify({ avatarUrl: profileImageData }),
    });
}
