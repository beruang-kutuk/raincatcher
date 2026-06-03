export type PlaceholderSaveResult = {
    ok: boolean;
    message: string;
    savedAt: string;
};

export async function saveFrontendPlaceholder(
    label: string,
    payload: unknown,
): Promise<PlaceholderSaveResult> {
    // TODO: Replace this placeholder with the matching Spring Boot endpoint when persistence is ready.
    void payload;

    await new Promise((resolve) => {
        globalThis.setTimeout(resolve, 650);
    });

    return {
        ok: true,
        message: `${label} saved successfully. Backend persistence endpoint is ready to connect later.`,
        savedAt: new Date().toISOString(),
    };
}
