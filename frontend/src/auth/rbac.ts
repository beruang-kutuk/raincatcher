import { resetThemePreference } from "../theme/theme";

export type UserRole = "SUPER_ADMIN" | "LAB_ASSISTANT";

export const ROLE_LABELS: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    LAB_ASSISTANT: "Lab Assistant",
};

const ROLE_DASHBOARDS: Record<UserRole, string> = {
    SUPER_ADMIN: "/admin/dashboard",
    LAB_ASSISTANT: "/lab/dashboard",
};

export function isUserRole(value: string | null): value is UserRole {
    return value === "SUPER_ADMIN" || value === "LAB_ASSISTANT";
}

export function getStoredRole(): UserRole | null {
    const role = localStorage.getItem("rc_role");
    return isUserRole(role) ? role : null;
}

export function getDashboardPath(role: UserRole | null): string {
    if (!role) return "/login";
    return ROLE_DASHBOARDS[role];
}

export function clearSession() {
    localStorage.removeItem("rc_token");
    localStorage.removeItem("rc_role");
    localStorage.removeItem("rc_display_name");
    localStorage.removeItem("rc_avatar_url");
    resetThemePreference();
}
