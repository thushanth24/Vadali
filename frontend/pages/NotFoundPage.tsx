import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100 px-4">
      <h1 className="text-6xl font-extrabold text-blue-600">404</h1>
      <h2 className="text-3xl font-bold text-gray-800 mt-2">Page Not Found</h2>
      <p className="text-gray-600 mt-4 max-w-md">
        Sorry, the page you are looking for does not exist. It might have been moved or deleted.
      </p>
      <Link to="/" className="mt-8">
        <Button size="lg">Return to Homepage</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;