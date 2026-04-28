import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { DecodedUser } from '../../context/AuthContext';
import { loginRequest } from '../../services/api';
import type { AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { LogIn } from 'lucide-react';

const ROLE_HOME_PATH: Record<DecodedUser['role'], string> = {
    admin: '/admin',
    department_rep: '/portal',
    none: '/',
};

function canVisitRequestedPath(path: string | undefined, role: DecodedUser['role']) {
    if (!path) return false;
    if (role === 'admin') return !path.startsWith('/portal');
    if (role === 'department_rep') return !path.startsWith('/admin');
    return path === '/';
}

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { isAuthenticated, loginState, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const requestedPath = location.state?.from?.pathname as string | undefined;

    useEffect(() => {
        if (!isAuthenticated || !user) return;
        navigate(ROLE_HOME_PATH[user.role] || '/', { replace: true });
    }, [isAuthenticated, navigate, user]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const access = await loginRequest({
                username,
                password,
            });
            const decoded = jwtDecode<DecodedUser>(access);
            const roleHome = ROLE_HOME_PATH[decoded.role] || '/';
            const redirectPath = requestedPath && canVisitRequestedPath(requestedPath, decoded.role)
                ? requestedPath
                : roleHome;

            loginState(access);
            navigate(redirectPath, { replace: true });
        } catch (err: unknown) {
            const loginError = err as AxiosError<{ detail?: string }>;
            setError(loginError.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center py-20">
            <div className="card w-96 bg-base-100 shadow-2xl border-t-4 border-maroon">
                <div className="card-body">
                    <h2 className="card-title justify-center text-2xl text-maroon font-bold mb-4">
                        <LogIn className="w-6 h-6 mr-2"/> Login
                    </h2>
                    
                    {error && (
                        <div className="alert alert-error text-sm p-3 rounded-md mb-4">
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <form onSubmit={handleLogin}>
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text font-semibold">Username</span>
                            </label>
                            <input 
                                type="text" 
                                className="input input-bordered w-full focus:outline-maroon" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-control w-full mt-4">
                            <label className="label">
                                <span className="label-text font-semibold">Password</span>
                            </label>
                            <input 
                                type="password" 
                                className="input input-bordered w-full focus:outline-maroon" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-control mt-8">
                            <button 
                                type="submit" 
                                className="btn btn-primary bg-maroon hover:bg-maroon-dark border-none text-white w-full"
                                disabled={loading}
                            >
                                {loading ? <span className="loading loading-spinner"></span> : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
