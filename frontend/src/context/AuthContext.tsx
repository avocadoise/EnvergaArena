import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken, clearTokens } from '../services/auth';

export type UserRole = 'admin' | 'department_rep' | 'none';

export interface DecodedUser {
    user_id: number;
    username: string;
    role: UserRole;
    department_id: number | null;
    department_acronym: string | null;
}

interface AuthContextType {
    user: DecodedUser | null;
    isAuthenticated: boolean;
    loginState: (access: string) => void;
    logoutState: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<DecodedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // On mount, check if token exists and load user
        const token = getAccessToken();
        if (token) {
            try {
                const decoded = jwtDecode<DecodedUser>(token);
                // Check if expired
                const exp = (decoded as any).exp;
                if (exp && exp * 1000 < Date.now()) {
                    // Expired - wait for interceptor to refresh, or just clear
                    // Let's rely on api interceptor for refresh, but for initial state:
                    // we'll optimistically load it. If an API call fails, interceptor clears tokens.
                }
                setUser(decoded);
            } catch (e) {
                clearTokens();
            }
        }
        setIsLoading(false);
    }, []);

    const loginState = (access: string) => {
        try {
            const decoded = jwtDecode<DecodedUser>(access);
            setUser(decoded);
        } catch (e) {
            console.error("Invalid token format");
        }
    };

    const logoutState = () => {
        clearTokens();
        setUser(null);
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
