/**
 * Normalized API error for UI consumption.
 * Use normalizeApiError() to turn fetch Response or Error into this shape.
 */
import {
    STATUS_ERROR_MESSAGES,
    STATUS_ERROR_CODES,
    toAppError,
} from '@/app/lib/utils/errorHandler';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Keep the local map as a stable override; share default map from errorHandler
const STATUS_MESSAGES = STATUS_ERROR_MESSAGES;
const STATUS_CODES = STATUS_ERROR_CODES;


/**
 * Normalizes a failed fetch Response or an Error into a consistent ApiError for UI.
 */
export async function normalizeApiError(
  responseOrError: Response | Error
): Promise<ApiError> {
  if (responseOrError instanceof Response) {
    const status = responseOrError.status;
    let message = STATUS_MESSAGES[status];
    try {
      const body = await responseOrError.json();
      const raw = (body && (body.message ?? body.error ?? body.msg)) ?? null;
      if (typeof raw === "string" && raw.length > 0) message = raw;
    } catch {
      // keep default message
    }
    return {
      message: message ?? "An error occurred. Please try again.",
      code: STATUS_CODES[status] ?? "REQUEST_FAILED",
      status,
    };
  }

  const err = responseOrError as Error;
  const appError = toAppError(err);
  return {
    message: appError.message,
    code: appError.code,
    status: appError.statusCode,
  };
}

/**
 * From an unknown catch value, returns a string message safe for UI display.
 */
export function getDisplayMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "Request was cancelled.";
    return error.message || "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
