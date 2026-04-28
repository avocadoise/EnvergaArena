
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

function getRoleHome(role?: UserRole) {
    if (role === 'admin') return '/admin';
    if (role === 'department_rep') return '/portal';
    return '/';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-base-200">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        // Redirect to login but save the attempted url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={getRoleHome(user.role)} replace />;
    }

    return <Outlet />;
};
