/**
 * Simple wrapper for storing tokens in localStorage.
 * Uses localStorage to survive browser restarts.
 */

const ACCESS_TOKEN_KEY = 'enverga_access_token';
const REFRESH_TOKEN_KEY = 'enverga_refresh_token';
export const AUTH_STORAGE_EVENT = 'enverga-auth-changed';

function emitAuthChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_STORAGE_EVENT));
    }
}

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    emitAuthChanged();
};

export const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    emitAuthChanged();
};

export const hasAccess = () => !!getAccessToken();
