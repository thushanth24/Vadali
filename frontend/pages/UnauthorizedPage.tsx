import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const getDashboardPath = () => {
        if (!user) return '/';
        switch (user.role) {
            case 'ADMIN': return '/dashboard/admin';
            case 'EDITOR': return '/dashboard/editor';
            case 'AUTHOR': return '/dashboard/author';
            default: return '/';
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100 px-4">
            <ShieldAlert className="h-20 w-20 text-red-500 mb-4" />
            <h1 className="text-5xl font-extrabold text-red-600">403</h1>
            <h2 className="text-3xl font-bold text-gray-800 mt-2">Access Denied</h2>
            <p className="text-gray-600 mt-4 max-w-md">
                Sorry, you do not have the necessary permissions to access this page.
            </p>
            <div className="mt-8 flex space-x-4">
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
                <Link to={getDashboardPath()}>
                    <Button>Return to Dashboard</Button>
                </Link>
            </div>
        </div>
    );
};

export default UnauthorizedPage;