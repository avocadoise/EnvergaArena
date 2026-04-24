import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: attach access token
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and auto-refresh token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = getRefreshToken();

            if (refreshToken) {
                try {
                    // Try to refresh token
                    const response = await axios.post(`${API_URL}/auth/refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access, refresh } = response.data;
                    // Note: some backends only return a new access token on refresh.
                    // SimpleJWT returns access, and optionally refresh if configured.
                    setTokens(access, refresh || refreshToken);

                    // Update the failed request with the new token
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${access}`;
                    }

                    // Retry original request
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed (token expired or invalid)
                    clearTokens();
                    // Optional: force a reload or redirect to login here if using window.location
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token available
                clearTokens();
            }
        }
        return Promise.reject(error);
    }
);

export default api;
