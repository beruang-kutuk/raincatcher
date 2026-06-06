export const BACKEND_BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL?.trim() || "http://192.168.100.137:8080";

export function buildBackendUrl(path: string) {
    return `${BACKEND_BASE_URL}${path}`;
}

export function resolveAvatarUrl(url: string | null | undefined): string {
    if (!url) return "";
    if (url.startsWith("/api/")) return `${BACKEND_BASE_URL}${url}`;
    return url;
}
