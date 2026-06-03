import { buildBackendUrl } from "./apiConfig";
import type { UserRole } from "../auth/rbac";

export type AdminUserRecord = {
    id: number;
    username: string;
    email: string;
    displayName: string;
    phone: string;
    role: UserRole;
    status: "Active" | "Suspended" | "Pending" | string;
};

async function fetchAdminJson<T>(path: string, init?: RequestInit): Promise<T> {
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
        throw new Error(`Admin request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export function getAdminUsers() {
    return fetchAdminJson<AdminUserRecord[]>("/api/admin/users");
}

export function getAdminUser(id: number) {
    return fetchAdminJson<AdminUserRecord>(`/api/admin/users/${id}`);
}

export function createAdminUser(user: Partial<AdminUserRecord> & { password?: string }) {
    return fetchAdminJson<AdminUserRecord>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(user),
    });
}

export function updateAdminUser(id: number, user: Partial<AdminUserRecord> & { password?: string }) {
    return fetchAdminJson<AdminUserRecord>(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(user),
    });
}

export function updateAdminUserStatus(id: number, status: string) {
    return fetchAdminJson<AdminUserRecord>(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
}

export function deleteAdminUser(id: number) {
    return fetchAdminJson<{ status: string }>(`/api/admin/users/${id}`, {
        method: "DELETE",
    });
}

export function getAdminRoles() {
    return fetchAdminJson<UserRole[]>("/api/admin/roles");
}
