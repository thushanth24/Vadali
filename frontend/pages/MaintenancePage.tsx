import React from 'react';
import { Wrench } from 'lucide-react';

const MaintenancePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-100 px-4">
        <Wrench className="h-20 w-20 text-blue-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold text-gray-800">Under Maintenance</h1>
        <p className="text-gray-600 mt-4 max-w-md">
            Our website is currently undergoing scheduled maintenance. We should be back shortly. Thank you for your patience!
        </p>
    </div>
  );
};

export default MaintenancePage;