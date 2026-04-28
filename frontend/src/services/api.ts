import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getAccessToken, setAccessToken } from './auth';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const baseConfig = {
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
};

const bareApi = axios.create(baseConfig);

const api = axios.create(baseConfig);

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken() {
    if (!refreshPromise) {
        refreshPromise = bareApi
            .post('/auth/refresh/')
            .then(response => {
                const access = response.data.access as string;
                setAccessToken(access);
                return access;
            })
            .catch(error => {
                clearTokens();
                throw error;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

export async function loginRequest(credentials: { username: string; password: string }) {
    const response = await bareApi.post('/auth/login/', credentials);
    const access = response.data.access as string;
    setAccessToken(access);
    return access;
}

export async function logoutRequest() {
    try {
        await bareApi.post('/auth/logout/');
    } finally {
        clearTokens();
    }
}

// Request interceptor: attach the in-memory access token.
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

// Response interceptor: refresh once using the HttpOnly cookie, then retry.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as RetriableRequestConfig | undefined;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const access = await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return api(originalRequest);
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
