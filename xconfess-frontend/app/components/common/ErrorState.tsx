'use client';

import React from 'react';
import RetryButton from './RetryButton';

interface ErrorStateProps {
  error?: string;
  onRetry?: () => void | Promise<void>;
  title?: string;
  description?: string;
  variant?: "error" | "warning";
  showIcon?: boolean;
  showRetry?: boolean;
  fullHeight?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  error = 'An error occurred',
  onRetry,
  title = 'Error',
  description,
  variant = "error",
  showIcon = true,
  showRetry = true,
  fullHeight = false,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const containerClass = fullHeight
    ? 'min-h-screen flex items-center justify-center'
    : 'py-8 px-4';
  const isWarning = variant === "warning";
  const accentText = isWarning ? "text-amber-400" : "text-red-500";
  const subtitleText = isWarning ? "text-amber-200" : "text-gray-300";
  const iconBg = isWarning ? "bg-amber-900/20" : "bg-red-900/20";
  const iconColor = isWarning ? "text-amber-400" : "text-red-500";

  return (
    <div className={containerClass}>
      <div className="text-center max-w-md">
        {showIcon && (
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center`}>
              <svg
                className={`w-8 h-8 ${iconColor}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {isWarning ? (
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.996-1.742 2.996H3.48c-1.53 0-2.492-1.662-1.743-2.996l6.52-11.59zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-6a1 1 0 00-1 1v3a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
            </div>
          </div>
        )}

        <h3 className={`text-lg font-semibold ${accentText} mb-2`}>{title}</h3>

        {description && (
          <p className="text-gray-400 text-sm mb-2">{description}</p>
        )}

        <p className={`${subtitleText} text-sm mb-6`}>{error}</p>

        <div className="flex flex-wrap justify-center gap-2">
          {showRetry && onRetry && (
            <RetryButton onRetry={onRetry} variant="primary" />
          )}
          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-4 py-2 rounded-md bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors text-sm font-medium"
            >
              {primaryActionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-sm font-medium"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
