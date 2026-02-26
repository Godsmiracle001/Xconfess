'use client';

import React from 'react';
import RetryButton from './RetryButton';

interface ErrorStateProps {
  error?: string;
  onRetry?: () => Promise<void>;
  title?: string;
  description?: string;
  showIcon?: boolean;
  showRetry?: boolean;
  fullHeight?: boolean;
  correlationId?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  error = 'An error occurred',
  onRetry,
  title = 'Error',
  description,
  showIcon = true,
  showRetry = true,
  fullHeight = false,
  correlationId,
}) => {
  const containerClass = fullHeight
    ? 'min-h-screen flex items-center justify-center'
    : 'py-8 px-4';

  return (
    <div className={containerClass}>
      <div className="text-center max-w-md">
        {showIcon && (
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}

        <h3 className="text-lg font-semibold text-red-500 mb-2">{title}</h3>

        {description && (
          <p className="text-gray-400 text-sm mb-2">{description}</p>
        )}

        <p className="text-gray-300 text-sm mb-6">{error}</p>

        {correlationId && (
          <div className="mb-6 p-2 bg-zinc-900 rounded border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Correlation ID</p>
            <p className="text-xs font-mono text-zinc-300 break-all">{correlationId}</p>
          </div>
        )}

        {showRetry && onRetry && (
          <div className="flex justify-center">
            <RetryButton onRetry={onRetry} variant="primary" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
