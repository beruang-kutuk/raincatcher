import { buildBackendUrl } from "./apiConfig";
import type { AuthUser, ProfileUpdatePayload } from "./authApi";

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
    if (!response.ok) throw new Error(`User profile request failed with status ${response.status}`);
    return (await response.json()) as T;
}

export function getUserProfile() {
    return userProfileJson<AuthUser>("/api/users/me");
}

export function updateUserProfile(payload: ProfileUpdatePayload) {
    return userProfileJson<AuthUser>("/api/users/me/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function uploadUserProfilePicture(profileImageData: string) {
    return userProfileJson<AuthUser>("/api/users/me/profile-picture", {
        method: "POST",
        body: JSON.stringify({ profileImageData }),
    });
}
