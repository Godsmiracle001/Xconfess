'use client';

import React, { Component, ReactNode } from 'react';
import { logError } from '@/app/lib/utils/errorHandler';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorCount = this.state.errorCount + 1;
    
    // Log error with context
    logError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorCount,
    });

    // Update error count
    this.setState({ errorCount });

    // If too many errors, might indicate a critical issue
    if (errorCount > 3) {
      console.error('Critical: Too many consecutive errors detected');
    }
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorCount: 0 });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full border border-red-900">
            <div className="flex items-center gap-3 mb-4">
              <svg
                className="w-6 h-6 text-red-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <h2 className="text-xl font-bold text-red-500">Something went wrong</h2>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              {this.state.error.message ||
                'An unexpected error occurred. Please try again.'}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4 text-xs text-gray-500 bg-zinc-800 p-2 rounded">
                <summary className="cursor-pointer font-mono">Error Details</summary>
                <pre className="mt-2 overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors font-medium"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
