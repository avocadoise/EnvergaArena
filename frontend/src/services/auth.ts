/**
 * Simple wrapper for storing tokens in localStorage.
 * Uses localStorage to survive browser restarts.
 */

const ACCESS_TOKEN_KEY = 'enverga_access_token';
const REFRESH_TOKEN_KEY = 'enverga_refresh_token';

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const hasAccess = () => !!getAccessToken();
