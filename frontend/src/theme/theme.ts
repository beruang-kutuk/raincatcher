export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "raincatcher-theme";

const LEGACY_THEME_STORAGE_KEY = "theme";

function isThemePreference(value: string | null): value is ThemePreference {
    return value === "light" || value === "dark";
}

export function getStoredThemePreference(): ThemePreference {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedTheme) ? storedTheme : "light";
}

export function applyThemePreference(theme: ThemePreference) {
    document.body.classList.toggle("dark-mode", theme === "dark");
}

export function saveThemePreference(theme: ThemePreference) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    applyThemePreference(theme);
}

export function clearLegacyThemePreference() {
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
}

export function resetThemePreference() {
    localStorage.removeItem(THEME_STORAGE_KEY);
    clearLegacyThemePreference();
    applyThemePreference("light");
}
