/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AUTH_STORAGE_EVENT, clearLegacyStoredTokens, clearTokens, getAccessToken, setAccessToken } from '../services/auth';
import { logoutRequest, refreshAccessToken } from '../services/api';

export type UserRole = 'admin' | 'department_rep' | 'none';

export interface DecodedUser {
    user_id: number;
    username: string;
    role: UserRole;
    department_id: number | null;
    department_name: string | null;
    department_acronym: string | null;
    exp?: number;
}

interface AuthContextType {
    user: DecodedUser | null;
    isAuthenticated: boolean;
    loginState: (access: string) => void;
    logoutState: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isTokenExpired = (token: DecodedUser | null) => {
    if (!token?.exp) return false;
    return token.exp * 1000 <= Date.now();
};

const getStoredUser = () => {
    const token = getAccessToken();
    if (!token) return null;

    try {
        const decoded = jwtDecode<DecodedUser>(token);
        if (isTokenExpired(decoded)) {
            clearTokens();
            return null;
        }
        return decoded;
    } catch {
        clearTokens();
        return null;
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<DecodedUser | null>(() => getStoredUser());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const syncAuthState = () => {
            setUser(getStoredUser());
        };

        window.addEventListener(AUTH_STORAGE_EVENT, syncAuthState);
        window.addEventListener('storage', syncAuthState);

        return () => {
            window.removeEventListener(AUTH_STORAGE_EVENT, syncAuthState);
            window.removeEventListener('storage', syncAuthState);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        clearLegacyStoredTokens();

        refreshAccessToken()
            .then(access => {
                if (!isMounted) return;
                const decoded = jwtDecode<DecodedUser>(access);
                if (isTokenExpired(decoded)) {
                    clearTokens();
                    setUser(null);
                    return;
                }
                setUser(decoded);
            })
            .catch(() => {
                if (!isMounted) return;
                setUser(null);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const loginState = (access: string) => {
        try {
            const decoded = jwtDecode<DecodedUser>(access);
            if (isTokenExpired(decoded)) {
                clearTokens();
                setUser(null);
                return;
            }
            setAccessToken(access);
            setUser(decoded);
        } catch {
            console.error("Invalid token format");
        }
    };

    const logoutState = () => {
        setUser(null);
        void logoutRequest();
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loginState, logoutState, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
