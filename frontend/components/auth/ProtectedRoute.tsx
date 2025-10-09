import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to the user's default dashboard page if they try to access a page they don't have permission for.
    const getDashboardPath = () => {
        if (!user) return '/';
        switch (user.role) {
            case UserRole.ADMIN: return '/dashboard/admin';
            case UserRole.EDITOR: return '/dashboard/editor';
            case UserRole.AUTHOR: return '/dashboard/author';
            default: return '/';
        }
    };
    return <Navigate to={getDashboardPath()} replace />;
  }

  return children;
};

export default ProtectedRoute;