const LEGACY_ACCESS_TOKEN_KEY = 'enverga_access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'enverga_refresh_token';

let accessToken: string | null = null;

export const AUTH_STORAGE_EVENT = 'enverga-auth-changed';

function emitAuthChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_STORAGE_EVENT));
    }
}

export const clearLegacyStoredTokens = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
};

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string) => {
    clearLegacyStoredTokens();
    accessToken = token;
    emitAuthChanged();
};

export const clearTokens = () => {
    clearLegacyStoredTokens();
    accessToken = null;
    emitAuthChanged();
};

export const hasAccess = () => !!accessToken;
