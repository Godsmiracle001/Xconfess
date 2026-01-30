import axios, { AxiosError } from 'axios';

export interface ErrorResponse {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    
    // Handle specific error status codes
    switch (axiosError.response?.status) {
      case 400:
        return axiosError.response?.data?.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 413:
        return 'The file is too large. Please upload a smaller file.';
      case 422:
        return axiosError.response?.data?.message || 'Please check your input and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Bad gateway. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        if (axiosError.message === 'Network Error') {
          return 'Network error. Please check your internet connection.';
        }
        return axiosError.response?.data?.message || 'An error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

export const getErrorCode = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.code;
  }

  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const codeMap: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[statusCode ?? 0] || 'NETWORK_ERROR';
  }

  return 'UNKNOWN_ERROR';
};

export const getErrorStatusCode = (error: unknown): number => {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (axios.isAxiosError(error)) {
    return error.response?.status ?? 500;
  }

  return 500;
};

export const isNetworkError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return !error.response && error.message === 'Network Error';
  }
  return false;
};

export const isServerError = (error: unknown): boolean => {
  const statusCode = getErrorStatusCode(error);
  return statusCode >= 500;
};

export const isClientError = (error: unknown): boolean => {
  const statusCode = getErrorStatusCode(error);
  return statusCode >= 400 && statusCode < 500;
};

export const isUnauthorized = (error: unknown): boolean => {
  return getErrorStatusCode(error) === 401;
};

export const isForbidden = (error: unknown): boolean => {
  return getErrorStatusCode(error) === 403;
};

export const logError = (
  error: unknown,
  context: string = 'Error',
  additionalInfo?: Record<string, unknown>
): void => {
  const timestamp = new Date().toISOString();
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const statusCode = getErrorStatusCode(error);

  const errorLog = {
    timestamp,
    context,
    message,
    code,
    statusCode,
    ...additionalInfo,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Log]', errorLog);
  }

  // In production, you could send this to an error tracking service
  // Example: Sentry, LogRocket, etc.
  if (process.env.NEXT_PUBLIC_ERROR_TRACKING_URL) {
    try {
      navigator.sendBeacon(
        process.env.NEXT_PUBLIC_ERROR_TRACKING_URL,
        JSON.stringify(errorLog)
      );
    } catch (e) {
      console.error('Failed to send error log:', e);
    }
  }
};

export const createErrorResponse = (error: unknown, context?: string): ErrorResponse => {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const statusCode = getErrorStatusCode(error);

  if (context) {
    logError(error, context);
  }

  return {
    message,
    code,
    statusCode,
  };
};
