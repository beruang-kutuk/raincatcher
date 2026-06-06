import { buildBackendUrl } from "./apiConfig";

export type NotificationAlert = {
    id: number;
    alertKey?: string | null;
    sourceType?: string | null;
    sourceId?: number | null;
    title: string;
    message: string;
    severity: "low" | "medium" | "high" | string;
    linkPath?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    readAt?: string | null;
    telegramSentAt?: string | null;
};

export type TelegramTestResponse = {
    sent: boolean;
    status: "sent" | "disabled" | "not_configured" | "failed" | string;
    message: string;
};

async function notificationJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("rc_token");
    let response: Response;
    try {
        response = await fetch(buildBackendUrl(path), {
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(init?.headers ?? {}),
            },
            ...init,
        });
    } catch {
        throw new Error("Unable to reach the notification service. Check your connection.");
    }
    if (!response.ok) {
        throw new Error(`Notification request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export function getNotifications() {
    return notificationJson<NotificationAlert[]>("/api/notifications");
}

export function getUnreadNotificationCount() {
    return notificationJson<{ count: number }>("/api/notifications/unread-count");
}

export function markNotificationRead(id: number) {
    return notificationJson<NotificationAlert>(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
    return notificationJson<{ updated: number; count: number }>("/api/notifications/read-all", { method: "PATCH" });
}

export function testTelegramNotification() {
    return notificationJson<TelegramTestResponse>("/api/notifications/test-telegram", { method: "POST" });
}
