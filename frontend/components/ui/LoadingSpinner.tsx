import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label,
  fullScreen = false,
  className = '',
}) => {
  const containerClasses = [
    'flex w-full items-center justify-center',
    fullScreen ? 'min-h-screen' : 'py-10',
    className,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <div className={containerClasses} role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <span className="modern-spinner" aria-hidden="true" />
        {label && <span className="text-sm text-gray-600">{label}</span>}
      </div>
    </div>
  );
};

export default LoadingSpinner;
